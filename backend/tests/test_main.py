
from uuid import uuid4


def create_test_product(client, quantity=10):
    unique_sku = f"TEST-{uuid4().hex[:8]}"

    product_data = {
        "product_name": "Test Product",
        "sku": unique_sku,
        "purchase_price": 500,
        "selling_price": 800,
        "quantity": quantity,
        "description": "Product for automated testing"
    }

    response = client.post("/products", json=product_data)

    assert response.status_code == 200

    return response.json()["product"]["product_id"]


def delete_test_product(client, product_id):
    response = client.delete(f"/products/{product_id}")
    assert response.status_code == 200


# Test 1: Home API
def test_home(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Welcome to Inventory Management System API"
    }


# Test 2: Get all products API
def test_get_products(client):
    response = client.get("/products")

    assert response.status_code == 200
    assert "total_products" in response.json()
    assert "products" in response.json()


# Test 3: Create product API
def test_create_product(client):
    product_id = create_test_product(client)

    response = client.get(f"/products/{product_id}")

    assert response.status_code == 200
    assert response.json()["product"]["product_name"] == "Test Product"

    delete_test_product(client, product_id)


# Test 4: Get product by ID API
def test_get_product_by_id(client):
    product_id = create_test_product(client)

    response = client.get(f"/products/{product_id}")

    assert response.status_code == 200
    assert response.json()["product"]["product_name"] == "Test Product"

    delete_test_product(client, product_id)


# Test 5: Update product API
def test_update_product(client):
    product_id = create_test_product(client)

    unique_sku = f"UPD-{uuid4().hex[:8]}"

    updated_data = {
        "product_name": "Updated Keyboard",
        "sku": unique_sku,
        "purchase_price": 600,
        "selling_price": 900,
        "quantity": 15,
        "description": "Updated keyboard"
    }

    response = client.put(
        f"/products/{product_id}",
        json=updated_data
    )

    assert response.status_code == 200
    assert response.json()["product"]["product_name"] == "Updated Keyboard"
    assert response.json()["product"]["quantity"] == 15

    delete_test_product(client, product_id)


# Test 6: Delete product API
def test_delete_product(client):
    product_id = create_test_product(client)

    response = client.delete(f"/products/{product_id}")

    assert response.status_code == 200
    assert response.json()["message"] == "Product deleted successfully"

    get_response = client.get(f"/products/{product_id}")
    assert get_response.status_code == 404


# Test 7: Stock IN API
def test_stock_in(client):
    product_id = create_test_product(client, quantity=10)

    stock_data = {
        "movement_type": "IN",
        "quantity": 5,
        "reason": "Test stock received"
    }

    response = client.post(
        f"/products/{product_id}/stock",
        json=stock_data
    )

    assert response.status_code == 200

    product_response = client.get(f"/products/{product_id}")

    assert product_response.status_code == 200
    assert product_response.json()["product"]["quantity"] == 15

    delete_test_product(client, product_id)


# Test 8: Stock OUT API
def test_stock_out(client):
    product_id = create_test_product(client, quantity=10)

    stock_data = {
        "movement_type": "OUT",
        "quantity": 3,
        "reason": "Test product sold"
    }

    response = client.post(
        f"/products/{product_id}/stock",
        json=stock_data
    )

    assert response.status_code == 200

    product_response = client.get(f"/products/{product_id}")

    assert product_response.status_code == 200
    assert product_response.json()["product"]["quantity"] == 7

    delete_test_product(client, product_id)


# Test 9: Insufficient Stock Validation
def test_insufficient_stock(client):
    product_id = create_test_product(client, quantity=5)

    stock_data = {
        "movement_type": "OUT",
        "quantity": 10,
        "reason": "Testing insufficient stock"
    }

    response = client.post(
        f"/products/{product_id}/stock",
        json=stock_data
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Insufficient stock available"

    product_response = client.get(f"/products/{product_id}")

    assert product_response.json()["product"]["quantity"] == 5

    delete_test_product(client, product_id)


# Test 10: Stock History API
def test_stock_history(client):
    product_id = create_test_product(client, quantity=10)

    stock_in_data = {
        "movement_type": "IN",
        "quantity": 5,
        "reason": "Test stock received"
    }

    stock_out_data = {
        "movement_type": "OUT",
        "quantity": 2,
        "reason": "Test stock sold"
    }

    in_response = client.post(
        f"/products/{product_id}/stock",
        json=stock_in_data
    )

    assert in_response.status_code == 200

    out_response = client.post(
        f"/products/{product_id}/stock",
        json=stock_out_data
    )

    assert out_response.status_code == 200

    history_response = client.get(
        f"/products/{product_id}/stock-history"
    )

    assert history_response.status_code == 200
    assert history_response.json()["total_movements"] == 2

    delete_test_product(client, product_id)
