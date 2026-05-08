## Requestor Information

| **Field** | **Detail** | 
| :--- | :--- |
| **Name/NIK** | Kiki Sundari / 1571302970061 | 
| **Email Address** | laziswafdarunnajah42@gmail.com | 
| **Title** |  | 
| **Department / Group** | Laziswaf Darunnajah | 
| **Mobile Phone** | 08111441942 | 

## PIC Information

| **Role** | **Bank Syariah Indonesia** | **(Mitra)** | 
| :--- | :--- | :--- |
| **Name** | Security Operation Center | Kiki Sundari | 
| **Email Address** | ciso.secops@banksi.co.id | laziswafdarunnajah42@gmail.com | 
| **Phone Number** | 021-2300509 | 08111441942 | 

## VPN Device Information

| **Parameter** | **BANK SYARIAH INDONESIA** | **(Mitra)** | 
| :--- | :--- | :--- |
| **Peer IP Address** | 103.23.117.76 | 76.13.198.83 | 
| **VPN Device** | Paloalto | StrongSwan (Linux IPsec) on Ubuntu 24 | 
| **Site** | Data Center BSI | (Hostinger/VPS) | 

## IPSec Parameter

| **Phase** | **Parameter** | **BANK SYARIAH INDONESIA** | **(Mitra)** | 
| :--- | :--- | :--- | :--- |
| **IKE (Phase 1)** | Pre-Share Key |  |  | 
|  | Encryption Scheme | IKEv2 | IKEv2 | 
|  | Diffie-Hellman Group | DH Group 14 | DH Group 14 | 
|  | Encryption Algorithm | AES-256 | AES-256 | 
|  | Hashing Algorithm | SHA256 | SHA256 | 
|  | Main or Aggressive Mode | Main | Main | 
|  | Lifetime (for renegotiation) | 86400 | 86400 | 
| **IPSec (Phase 2)** | Encapsulation | ESP (Encapsulation Security Payload) | ESP | 
|  | Encryption Algorithm | AES-256 | AES-256 | 
|  | Authentication Algorithm | SHA256 | SHA256 | 
|  | Perfect Forward Secrecy | No | No | 
|  | Lifetime (for renegotiation) | 86400 | 86400 | 
|  | Life Size in KB (for renegotiation) |  | \- |