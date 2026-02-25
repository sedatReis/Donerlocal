# Lokale Bestell-Webapp (Nummernfreigabe + Speisekarte + Admin)

Diese Webapp läuft **lokal** (ohne Datenbank).  
- Produkte liegen in `data/products.json`
- Bestellungen werden in `data/orders.json` gespeichert
- Freigegebene Kundennummern werden in `data/access-numbers.json` gespeichert
- Neue freigegebene Nummern werden automatisch als Bon gedruckt (wenn Druck aktiv)
- Kundennummern sind **10 Minuten** gültig
- Bestellungen werden nach **15 Minuten automatisch gelöscht** (Cleanup läuft im Hintergrund)

## Start

1. Node.js installieren (empfohlen: Node 18+)
2. Im Projektordner:

```bash
npm install
npm run dev
```

Dann öffnen:
- Kundenzugang (Nummer eingeben): http://localhost:3000/access.html
- Speisekarte (nur mit gültiger Nummer): http://localhost:3000/index.html
- Admin Login:   http://localhost:3000/admin-login.html
- Admin Panel:   http://localhost:3000/admin
- Nummern-Panel: http://localhost:3000/numbers

## Admin Zugang (mit Passwort-Hash)

Das Admin Panel ist geschuetzt. Login erfolgt per Session-Cookie (`HttpOnly` + `SameSite=Strict`).

Empfohlene Umgebungsvariablen:
- `DONER_ADMIN_USER`
- `DONER_ADMIN_PASSWORD_SALT`
- `DONER_ADMIN_PASSWORD_HASH`
- `DONER_HOST` (fuer WLAN-Zugriff: `0.0.0.0`)
- `PORT` (z.B. `3000`)
- `DONER_RECEIPT_PRINTER` (z.B. `EPSON TM-m30III`)
- `DONER_PRINT_ACCESS_NUMBER` (`1` oder `0`)
- `DONER_MENU_QR_PATH` (optional, default: `/index.html`)
- `DONER_TOP_QR_TEXT` (optional, statischer oberer QR-Inhalt)
- `DONER_WIFI_SSID`, `DONER_WIFI_PASSWORD`, `DONER_WIFI_AUTH` (`WPA`/`WEP`/`nopass`), `DONER_WIFI_HIDDEN` (optional; nur falls kein `DONER_TOP_QR_TEXT` gesetzt ist)

Hash erzeugen (Beispiel):

```bash
node -e 'const c=require("crypto"); const salt=c.randomBytes(16).toString("hex"); const hash=c.scryptSync("DEIN_PASSWORT", salt, 64).toString("hex"); console.log("DONER_ADMIN_PASSWORD_SALT="+salt); console.log("DONER_ADMIN_PASSWORD_HASH="+hash);'
```

Start mit Zugangsdaten:

```bash
export DONER_ADMIN_USER=chef
export DONER_ADMIN_PASSWORD_SALT=...dein_salt...
export DONER_ADMIN_PASSWORD_HASH=...dein_hash...
export DONER_HOST=0.0.0.0
export PORT=3000
export DONER_RECEIPT_PRINTER="EPSON TM-m30III"
export DONER_PRINT_ACCESS_NUMBER=1
npm run dev
```

Hinweis Druck:
- Beim Klick auf "Nummer freigeben" wird ein Bon an den konfigurierten Drucker gesendet (`lp` auf macOS/Linux, Windows-Spooler via PowerShell/WinSpool auf Windows).
- Nach dem Bon sendet das System einen ESC/POS-Cut-Befehl (automatisches Abschneiden).
- Falls kein Drucker per ENV gesetzt ist, versucht das System automatisch `EPSON TM-m30III` und `EPSON_TM_m30III`.
- Auf dem Bon wird gross `Ihre Bestellnummer` + Nummer gedruckt.
- Ueber dem ersten QR steht `1. Mit WLAN verbinden` (WLAN-QR).
- Darunter steht `2. Speisekarte oeffnen` (dynamischer URL-QR).
- Unterer QR wird pro Bon dynamisch aus der aktuellen LAN-IP gebaut (`http://<ip>:<port>/index.html` bzw. `DONER_MENU_QR_PATH`).
- Oberer QR bleibt statisch: direkt ueber `DONER_TOP_QR_TEXT` oder aus den WLAN-Variablen.
- Im Footer wird `public/img/onkelbekoslogo.png` als Logo gedruckt (Fallback: `images/Onkelbekoslogo.png`).

## Zugriff im WLAN (Mini-PC als Server)

1. Server mit `DONER_HOST=0.0.0.0` starten.
2. Mini-PC und Kunden im gleichen WLAN.
3. In der Konsole wird nach Start mindestens eine `WLAN`-URL angezeigt, z.B. `http://192.168.1.50:3000`.
4. Kunden nutzen genau diese URL (plus Pfad), z.B. `http://192.168.1.50:3000/access.html`.
5. Falls kein Zugriff möglich: macOS Firewall fuer Port `3000` freigeben.

Ohne ENV wird ein Fallback verwendet:
- Benutzer: `admin`
- Passwort: `admin123`

## Produkte ändern

`data/products.json` bearbeiten.
- `optionsEnabled: false` = keine Checkboxen (z.B. Pommes)
- Bilder: Lege Dateien unter `public/img/` ab und setze den Pfad in `image`.

## Ablauf

1. Admin erstellt im Nummern-Panel eine neue Kundennummer (10 Minuten gültig)
2. Kunde gibt die Nummer im Kundenzugang ein und gelangt dann zur Speisekarte
3. Kunde bestellt über den Warenkorb und gibt am Ende zusätzlich die Tischnummer ein
4. Bestellung enthält Tischnummer plus Zugangsnummer
5. Admin sieht Bestellungen live, kann "Erledigt" klicken
6. Bestellungen verschwinden automatisch nach 15 Minuten
