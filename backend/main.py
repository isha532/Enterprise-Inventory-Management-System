
from typing import Literal

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
import models


# Create FastAPI application
app = FastAPI(
    title="Inventory Management System",
    description="Enterprise Inventory & Order Management API",
    version="1.0.0"
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Product Request Schema
class ProductCreate(BaseModel):
    product_name: str = Field(min_length=2, max_length=100)
    sku: str = Field(min_length=3, max_length=30)
    purchase_price: float = Field(gt=0)
    selling_price: float = Field(gt=0)
    quantity: int = Field(ge=0)
    description: str | None = Field(default=None, max_length=255)


# Stock Movement Request Schema
class StockMovementCreate(BaseModel):
    movement_type: Literal["IN", "OUT"]
    quantity: int = Field(gt=0)
    reason: str = Field(min_length=3, max_length=255)


# Convert Product object into dictionary
def product_to_dict(product):
    return {
        "product_id": product.product_id,
        "product_name": product.product_name,
        "sku": product.sku,
        "purchase_price": product.purchase_price,
        "selling_price": product.selling_price,
        "quantity": product.quantity,
        "description": product.description
    }


# Convert Stock Movement into dictionary
def movement_to_dict(movement):
    return {
        "movement_id": movement.movement_id,
        "product_id": movement.product_id,
        "movement_type": movement.movement_type,
        "quantity": movement.quantity,
        "reason": movement.reason,
        "created_at": (
            movement.created_at.isoformat()
            if movement.created_at else None
        )
    }


# Home API
@app.get("/")
def home():
    return {
        "message": "Welcome to Inventory Management System API"
    }


# CREATE PRODUCT
@app.post("/products")
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):
    sku_exists = db.query(models.Product).filter(
        models.Product.sku == product.sku
    ).first()

    if sku_exists:
        raise HTTPException(
            status_code=400,
            detail="Product with this SKU already exists"
        )

    new_product = models.Product(**product.model_dump())

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return {
        "message": "Product added successfully",
        "product": product_to_dict(new_product)
    }


# GET ALL PRODUCTS
@app.get("/products")
def get_products(db: Session = Depends(get_db)):

    products = db.query(models.Product).all()

    return {
        "total_products": len(products),
        "products": [product_to_dict(p) for p in products]
    }


# GET PRODUCT BY ID
@app.get("/products/{product_id}")
def get_product_by_id(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(
        models.Product.product_id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {
        "product": product_to_dict(product)
    }


# UPDATE PRODUCT
@app.put("/products/{product_id}")
def update_product(
    product_id: int,
    updated_data: ProductCreate,
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(
        models.Product.product_id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    sku_exists = db.query(models.Product).filter(
        models.Product.sku == updated_data.sku,
        models.Product.product_id != product_id
    ).first()

    if sku_exists:
        raise HTTPException(
            status_code=400,
            detail="Another product already uses this SKU"
        )

    for key, value in updated_data.model_dump().items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return {
        "message": "Product updated successfully",
        "product": product_to_dict(product)
    }


# DELETE PRODUCT
@app.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(
        models.Product.product_id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    db.delete(product)
    db.commit()

    return {
        "message": "Product deleted successfully"
    }


# STOCK IN / STOCK OUT
@app.post("/products/{product_id}/stock")
def update_stock(
    product_id: int,
    stock_data: StockMovementCreate,
    db: Session = Depends(get_db)
):
    # Lock product row while updating stock
    product = db.query(models.Product).filter(
        models.Product.product_id == product_id
    ).with_for_update().first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Calculate new stock
    if stock_data.movement_type == "IN":
        product.quantity += stock_data.quantity

    elif stock_data.movement_type == "OUT":
        if product.quantity < stock_data.quantity:
            raise HTTPException(
                status_code=400,
                detail="Insufficient stock available"
            )

        product.quantity -= stock_data.quantity

    # Create stock history record
    new_movement = models.StockMovement(
        product_id=product_id,
        movement_type=stock_data.movement_type,
        quantity=stock_data.quantity,
        reason=stock_data.reason
    )

    try:
        db.add(new_movement)
        db.commit()
        db.refresh(product)
        db.refresh(new_movement)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Stock updated successfully",
        "movement": movement_to_dict(new_movement),
        "updated_product": product_to_dict(product)
    }


# GET PRODUCT STOCK HISTORY
@app.get("/products/{product_id}/stock-history")
def get_stock_history(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(
        models.Product.product_id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    movements = db.query(models.StockMovement).filter(
        models.StockMovement.product_id == product_id
    ).order_by(
        models.StockMovement.created_at.desc()
    ).all()

    return {
        "product_id": product_id,
        "product_name": product.product_name,
        "total_movements": len(movements),
        "stock_history": [
            movement_to_dict(movement)
            for movement in movements
        ]
    }
