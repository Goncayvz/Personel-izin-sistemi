from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional

from backend.database import (
    create_izin,
    get_all_izinler,
    get_izin_by_id,
    izin_istatistikleri,
    update_izin_durum,
)
from backend.models import IzinDurumGuncelle, IzinTalep

router = APIRouter(tags=["izin"])

@router.get("/izinler")
async def tum_izinleri_getir(
    durum: Optional[str] = Query(None, description="Filtreleme: Bekliyor, Onaylandı, Reddedildi")
):
    """Tüm izin taleplerini listele (opsiyonel durum filtresi ile)"""
    izinler = get_all_izinler()
    
    if durum:
        izinler = [i for i in izinler if i['durum'] == durum]
    
    return izinler

@router.get("/izinler/{izin_id}")
async def izin_getir(izin_id: int):
    """Tek bir izin talebini getir"""
    izin = get_izin_by_id(izin_id)
    if not izin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İzin talebi bulunamadı"
        )
    return izin

@router.post("/izin-talep", status_code=status.HTTP_201_CREATED)
async def izin_talep_et(talep: IzinTalep):
    """Yeni izin talebi oluştur"""
    try:
        # Tarih validasyonu ek
        if talep.baslangicTarihi > talep.bitisTarihi:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Başlangıç tarihi bitiş tarihinden sonra olamaz"
            )
        
        yeni_talep = create_izin(talep.model_dump())
        return yeni_talep
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Talep oluşturulamadı: {str(e)}"
        )

@router.put("/izin-durum/{izin_id}")
async def izin_durum_guncelle(izin_id: int, guncelleme: IzinDurumGuncelle):
    """İzin talebi durumunu güncelle (Onaylandı/Reddedildi)"""
    existing = get_izin_by_id(izin_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İzin talebi bulunamadı"
        )
    
    # Zaten onaylanmış/reddedilmiş talebi tekrar güncellemeyi engelle
    if existing['durum'] != 'Bekliyor':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bu talep zaten {existing['durum']} durumunda, tekrar değiştirilemez"
        )
    
    updated = update_izin_durum(izin_id, guncelleme.durum)
    return updated

@router.delete("/izinler/{izin_id}")
async def izin_sil(izin_id: int):
    """İzin talebi sil (opsiyonel ekstra özellik)"""
    from backend.database import delete_izin
    deleted = delete_izin(izin_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İzin talebi bulunamadı"
        )
    return {"message": "İzin talebi başarıyla silindi"}

@router.get("/istatistikler")
async def istatistikler():
    """İstatistikler (opsiyonel)"""
    return izin_istatistikleri()
