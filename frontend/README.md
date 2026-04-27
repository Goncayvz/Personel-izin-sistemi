# Frontend (Statik)

Statik (framework’süz) iki ekranlı mini arayüz:

- **Personel Ekranı**: yeni izin talebi formu
- **Yönetici Ekranı**: talepleri listeleme + onayla/reddet/sil + istatistik

## Çalıştırma

```powershell
cd frontend
python -m http.server 3000
```


## Backend bağlantısı

Üst kısımdaki `API` alanına backend adresini yazın (örn. `http://localhost:5000`) ve `Kaydet` deyin.
Bu değer tarayıcıda `localStorage` içine kaydedilir.

## Kullanılan API endpoint’leri

Arayüz aşağıdaki endpoint’leri kullanır:

- `GET /izinler` (opsiyonel `?durum=...` filtresi)
- `POST /izin-talep`
- `PUT /izin-durum/{izin_id}`
- `DELETE /izinler/{izin_id}`
- `GET /istatistikler`
