from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette import status

import logging

from backend.database import DB_PATH, get_db_connection, init_db
from backend.routes.izin_routes import router as izin_router

app = FastAPI(title="Personel İzin Sistemi API", version="1.0.0")

# CORS Ayarları
# Not: allow_credentials=True iken allow_origins=["*"] geçersiz olabildiği için
# (tarayıcılar credential + wildcard'ı reddeder) burada credentials kapalı.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    logging.getLogger("uvicorn").info("SQLite DB path: %s", DB_PATH)


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": "Eksik veya hatalı alanlar var.",
            "errors": exc.errors(),
        },
    )


# Router'lar
app.include_router(izin_router)


@app.get("/")
async def root():
    db_exists = DB_PATH.exists()
    db_bytes = DB_PATH.stat().st_size if db_exists else 0

    izin_count = None
    izin_sample = None
    diag_error = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS c FROM izin_talepleri")
        izin_count = int(cur.fetchone()[0])
        cur.execute(
            "SELECT id, adSoyad, izinTuru, baslangicTarihi, bitisTarihi, durum "
            "FROM izin_talepleri ORDER BY id DESC LIMIT 3"
        )
        izin_sample = [dict(r) for r in cur.fetchall()]
        conn.close()
    except Exception as e:
        diag_error = str(e)

    return {
        "message": "Personel İzin Sistemi API Çalışıyor",
        "database": "SQLite",
        "db_path": str(DB_PATH),
        "db_exists": db_exists,
        "db_bytes": db_bytes,
        "izin_talepleri_count": izin_count,
        "izin_talepleri_sample": izin_sample,
        "diagnostics_error": diag_error,
        "endpoints": [
            "/izinler",
            "/izinler/{izin_id}",
            "/izin-talep",
            "/izin-durum/{izin_id}",
            "/istatistikler",
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=5000, reload=True)
    
