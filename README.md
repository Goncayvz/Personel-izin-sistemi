# Personel İzin Sistemi

Bu repo, **FastAPI + SQLite** backend ve **statik (vanilla)** bir frontend içerir.

## Gereksinimler

- Python 3.10+ (önerilir)
- `pip`

## Backend (FastAPI)

Komutları repo kök dizininde çalıştırın:

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 5000
```

Backend: `http://localhost:5000`

### Endpoint’ler

- `GET /` : API durum + diagnostik (DB yolu vb.)
- `POST /izin-talep` : Yeni izin talebi oluşturur
- `GET /izinler` : Tüm izin talepleri (opsiyonel `?durum=Bekliyor|Onaylandı|Reddedildi`)
- `GET /izinler/{izin_id}` : Tek kayıt getirir
- `PUT /izin-durum/{izin_id}` : Durum günceller (`Onaylandı` / `Reddedildi`)
- `DELETE /izinler/{izin_id}` : Talep siler (opsiyonel)
- `GET /istatistikler` : Durum bazlı sayılar

## Veritabanı (SQLite)

- Veritabanı dosyası: `izinler.db` (repo kökü)
- Backend, `/` endpoint’inde aktif DB yolunu `db_path` alanında döner.
- göremk isterseniz vscode da extention kısmından SQLite Viewer eklentisini indirip  onunla açarsanız kayıtları görebilirsiniz.

Not: “DB boş görünüyor” sorunu genelde yanlış dosyayı açmaktan olur. Daha önce `cd backend` ile çalıştırdıysanız `backend/izinler.db` oluşmuş olabilir.

## Frontend (Statik)

```powershell
cd frontend
python -m http.server 3000
```

Frontend: `http://localhost:3000`

### Backend bağlantısı

Sayfanın üst kısmındaki `API` alanına backend adresini yazın (örn. `http://localhost:5000`) ve `Kaydet` deyin.

## Hızlı kontrol

- Backend çalışıyor mu? `http://localhost:5000/`
- Kayıt var mı? `http://localhost:5000/izinler`
## Personel ekranı
<img width="1280" height="822" alt="image" src="https://github.com/user-attachments/assets/cc606860-3b9e-4be8-ad2a-94c99c838e02" />


  
## Yönetici Ekranı
<img width="1792" height="795" alt="image" src="https://github.com/user-attachments/assets/960bccc9-87aa-4985-bf12-43858ca2b2c4" />



  
