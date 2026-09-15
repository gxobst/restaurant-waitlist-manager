import bcrypt


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def verify_pin(stored_hash: str, pin: str) -> bool:
    return bcrypt.checkpw(pin.encode(), stored_hash.encode())


def generate_token() -> str:
    from uuid import uuid4
    return str(uuid4())


def revoke_token(token: str) -> None:
    from app.store.memory import store
    store.remove_token(token)
