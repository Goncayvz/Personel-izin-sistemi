import sqlite3
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "izinler.db"
LEGACY_DB_PATH = Path(__file__).resolve().parent / "izinler.db"


def get_db_connection():
    """Veritabanı bağlantısı oluştur"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # Sözlük benzeri erişim için
    return conn


def init_db():
    """Tabloyu oluştur (eğer yoksa)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS izin_talepleri (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            adSoyad TEXT NOT NULL,
            izinTuru TEXT NOT NULL,
            baslangicTarihi TEXT NOT NULL,
            bitisTarihi TEXT NOT NULL,
            aciklama TEXT,
            durum TEXT DEFAULT 'Bekliyor'
        )
        """
    )

    conn.commit()

    # Eski çalışma şeklinde (cd backend) yazılmış olabilecek DB'den veri taşı.
    if LEGACY_DB_PATH != DB_PATH and LEGACY_DB_PATH.exists():
        try:
            cursor.execute("SELECT COUNT(*) FROM izin_talepleri")
            current_count = int(cursor.fetchone()[0])

            if current_count == 0:
                legacy_conn = sqlite3.connect(str(LEGACY_DB_PATH))
                legacy_conn.row_factory = sqlite3.Row
                legacy_cur = legacy_conn.cursor()
                legacy_cur.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='izin_talepleri'"
                )
                has_table = legacy_cur.fetchone() is not None
                if has_table:
                    legacy_cur.execute("SELECT * FROM izin_talepleri ORDER BY id")
                    rows = legacy_cur.fetchall()
                    if rows:
                        cursor.executemany(
                            """
                            INSERT OR IGNORE INTO izin_talepleri
                            (id, adSoyad, izinTuru, baslangicTarihi, bitisTarihi, aciklama, durum)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """,
                            [
                                (
                                    r["id"],
                                    r["adSoyad"],
                                    r["izinTuru"],
                                    r["baslangicTarihi"],
                                    r["bitisTarihi"],
                                    r["aciklama"],
                                    r["durum"],
                                )
                                for r in rows
                            ],
                        )
                        conn.commit()
                legacy_conn.close()
        except Exception:
            # Diagnostik amaçlı migrasyon best-effort; hata backend'i düşürmesin.
            pass

    conn.close()


def create_izin(talep: Dict) -> Dict:
    """Yeni izin talebi oluştur"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO izin_talepleri
        (adSoyad, izinTuru, baslangicTarihi, bitisTarihi, aciklama, durum)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            talep["adSoyad"],
            talep["izinTuru"],
            talep["baslangicTarihi"].isoformat()
            if isinstance(talep["baslangicTarihi"], date)
            else talep["baslangicTarihi"],
            talep["bitisTarihi"].isoformat() if isinstance(talep["bitisTarihi"], date) else talep["bitisTarihi"],
            talep.get("aciklama", ""),
            "Bekliyor",
        ),
    )

    izin_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return get_izin_by_id(izin_id)


def get_all_izinler() -> List[Dict]:
    """Tüm izin taleplerini getir"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM izin_talepleri ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_izin_by_id(izin_id: int) -> Optional[Dict]:
    """ID'ye göre izin talebi getir"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM izin_talepleri WHERE id = ?", (izin_id,))
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def update_izin_durum(izin_id: int, yeni_durum: str) -> Optional[Dict]:
    """İzin talebi durumunu güncelle"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE izin_talepleri
        SET durum = ?
        WHERE id = ?
        """,
        (yeni_durum, izin_id),
    )

    conn.commit()
    conn.close()

    return get_izin_by_id(izin_id)


def delete_izin(izin_id: int) -> bool:
    """İzin talebi sil (opsiyonel - ekstra özellik)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM izin_talepleri WHERE id = ?", (izin_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()

    return deleted


def izin_istatistikleri() -> Dict:
    """İstatistikler (opsiyonel)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT durum, COUNT(*) as sayi FROM izin_talepleri GROUP BY durum")
    stats = {row["durum"]: row["sayi"] for row in cursor.fetchall()}
    conn.close()

    return stats
