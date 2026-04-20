from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from app.db.base import get_db
from app.models.usuario import Usuario
from app.auth import verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])


@router.post("/login")
async def login(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Usuario).where(
                Usuario.email == data.get("email"),
                Usuario.activo == 1,
            )
        )
        usuario = result.scalar_one_or_none()

        if not usuario or not verify_password(data.get("password", ""), usuario.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
            )

        token = create_access_token(
            data={"sub": str(usuario.id)},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "usuario": {
                "id": usuario.id,
                "nombre_usuario": usuario.nombre_usuario,
                "email": usuario.email,
                "rol": usuario.rol,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return {
        "id": current_user.id,
        "nombre_usuario": current_user.nombre_usuario,
        "email": current_user.email,
        "rol": current_user.rol,
    }


@router.post("/logout")
async def logout():
    return {"mensaje": "Sesión cerrada correctamente"}