from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class IzinTalep(BaseModel):
    adSoyad: str = Field(..., min_length=2, max_length=100)
    izinTuru: str = Field(..., pattern="^(Yıllık İzin|Sağlık İzin|Mazaret)$")
    baslangicTarihi: date
    bitisTarihi: date
    aciklama: Optional[str] = ""

    @field_validator("bitisTarihi")
    @classmethod
    def bitis_baslangictan_once_olamaz(cls, v: date, info):
        baslangic = info.data.get("baslangicTarihi")
        if baslangic and v < baslangic:
            raise ValueError("Bitiş Tarihi Başlangıçtan önce olamaz")
        return v


class IzinDurumGuncelle(BaseModel):
    durum: str = Field(..., pattern="^(Onaylandı|Reddedildi)$")
