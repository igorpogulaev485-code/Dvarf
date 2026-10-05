class AppError(Exception):
    def __init__(self, message: str, *, code: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class ConflictError(AppError):
    def __init__(self, message: str, *, code: str = "conflict") -> None:
        super().__init__(message, code=code, status_code=409)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized", *, code: str = "unauthorized") -> None:
        super().__init__(message, code=code, status_code=401)


class NotConfiguredError(AppError):
    def __init__(self, message: str, *, code: str = "provider_not_configured") -> None:
        super().__init__(message, code=code, status_code=501)
