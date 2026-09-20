import { Lease, Property } from '../types';
import { formatDate } from './date';

/**
 * Generates an official, printable HTML document for a lease agreement.
 * When opened in a new tab/window, it looks and behaves like an authentic PDF document
 * with print-to-PDF styles, headers, signatures, and legal structure.
 */
export function openLeasePdfWindow(lease: Partial<Lease>, property?: Partial<Property>) {
  const newWin = window.open('', '_blank');
  if (!newWin) {
    alert('Prosím povoľte vyskakovacie okná (pop-ups) v prehliadači pre zobrazenie PDF zmluvy.');
    return;
  }

  const tenantName = lease.tenantName || 'Nájomca';
  const tenantEmail = lease.tenantEmail || '—';
  const tenantPhone = lease.tenantPhone || '—';
  const propName = property?.name || lease.propertyName || 'Byt';
  const propUnit = property?.unitNumber || lease.propertyUnit || '1';
  const propAddress = property?.address || 'Hlavná ulica';
  const propCity = property?.city || 'Bratislava';
  const startDate = formatDate(lease.startDate || new Date().toISOString());
  const endDate = formatDate(lease.endDate || '');
  const rentTotal = lease.rentAmount || 0;
  const baseRent = lease.baseRent ?? rentTotal;
  const utilities = lease.utilitiesAmount ?? 0;
  const deposit = lease.depositAmount || rentTotal * 2;
  const contractId = lease.id || 'ZMLUVA-' + Date.now();
  const title = lease.contractFileName || `Zmluva_o_najme_${tenantName.replace(/\s+/g, '_')}.pdf`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      line-height: 1.6;
    }
    .toolbar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 100;
    }
    .toolbar button {
      background: #10b981;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .toolbar button:hover {
      background: #059669;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px 56px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-logo {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .doc-meta {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    h1 {
      text-align: center;
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 24px 0 32px 0;
      color: #0f172a;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .party h3 {
      margin: 0 0 8px 0;
      font-size: 13px;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 24px 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-left: 3px solid #10b981;
      padding-left: 8px;
    }
    p, li {
      font-size: 13px;
      color: #334155;
      text-align: justify;
    }
    ol {
      padding-left: 20px;
      margin: 8px 0;
    }
    li {
      margin-bottom: 6px;
    }
    .amount-badge {
      font-weight: 700;
      color: #0f172a;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .signatures {
      margin-top: 60px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      padding-top: 24px;
    }
    .sign-box {
      border-top: 1px dashed #94a3b8;
      padding-top: 10px;
      text-align: center;
      font-size: 12px;
      color: #475569;
    }
    .security-watermark {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body {
        background: none;
        padding: 0;
      }
      .toolbar {
        display: none;
      }
      .page-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <div style="font-size: 13px; font-weight: 600;">
      📄 ${title}
    </div>
    <button onclick="window.print()">
      🖨️ Vytlačiť / Uložiť ako PDF
    </button>
  </div>

  <div class="page-container">
    <div class="header">
      <div>
        <div class="brand-logo">RESR, s.r.o.</div>
        <div class="brand-sub">Správa nehnuteľností &amp; Nájomný manažment</div>
      </div>
      <div class="doc-meta">
        <div><strong>Ev. číslo zmluvy:</strong> ${contractId}</div>
        <div><strong>Miesto a dátum:</strong> ${propCity}, dňa ${startDate}</div>
      </div>
    </div>

    <h1>ZMLUVA O NÁJME BYTU</h1>

    <div class="parties">
      <div class="party">
        <h3>1. Prenajímateľ</h3>
        <div><strong>Obchodné meno:</strong> RESR, s.r.o.</div>
        <div><strong>IČO:</strong> 52 349 102</div>
        <div><strong>Zastúpený:</strong> Alex Vance</div>
        <div><strong>Email:</strong> sprava@resr.sk</div>
        <div><strong>Telefón:</strong> +421 905 123 456</div>
      </div>

      <div class="party">
        <h3>2. Nájomca</h3>
        <div><strong>Meno a priezvisko:</strong> ${tenantName}</div>
        <div><strong>Email:</strong> ${tenantEmail}</div>
        <div><strong>Telefón:</strong> ${tenantPhone}</div>
        <div><strong>Spoločnosť:</strong> ${lease.operatorCompany || 'Fyzická osoba'}</div>
      </div>
    </div>

    <div class="section-title">Článok I. Predmet nájmu</div>
    <p>
      1.1 Prenajímateľ prehlasuje, že je výlučným vlastníkom alebo oprávneným správcom nehnuteľnosti 
      nachádzajúcej sa na adrese: <strong>${propAddress}, ${propCity}</strong>, označenej ako 
      <strong>${propName}</strong>, číslo jednotky <strong>${propUnit}</strong>.
    </p>
    <p>
      1.2 Predmetom nájmu je bytová jednotka so všetkým príslušenstvom a zariadením podľa preberacieho protokolu.
    </p>

    <div class="section-title">Článok II. Doba nájmu</div>
    <p>
      2.1 Nájomný vzťah sa uzatvára na dobu určitú:
    </p>
    <p style="margin-left: 20px; font-weight: 600;">
      Začiatok nájmu: ${startDate} &nbsp;&mdash;&nbsp; Koniec nájmu: ${endDate}
    </p>

    <div class="section-title">Článok III. Nájomné a úhrady za plnenia spojené s užívaním bytu</div>
    <p>
      3.1 Zmluvné strany sa dohodli na mesačnom nájomnom v celkovej výške:
    </p>
    <p style="margin-left: 20px; font-size: 15px;">
      Celkové mesačné nájomné: <span class="amount-badge">€${rentTotal.toLocaleString()} / mesiac</span>
    </p>
    <p style="margin-left: 20px; font-size: 13px; color: #475569;">
      (z toho základné nájomné: €${baseRent.toLocaleString()} + zálohové platby za energie a služby: €${utilities.toLocaleString()})
    </p>
    <p>
      3.2 Nájomné je splatné vždy vopred najneskôr do 20. dňa kalendárneho mesiaca predchádzajúceho mesiacu, za ktorý sa nájomné platí.
    </p>

    <div class="section-title">Článok IV. Finančná zábezpeka (Kaucia)</div>
    <p>
      4.1 Nájomca zložil pri podpise tejto zmluvy prenajímateľovi peňažnú zábezpeku (kauciu) vo výške 
      <span class="amount-badge">€${deposit.toLocaleString()}</span> na zabezpečenie prípadných pohľadávok prenajímateľa.
    </p>

    <div class="section-title">Článok V. Záverečné ustanovenia</div>
    <p>
      5.1 Zmluva nadobúda platnosť a účinnosť dňom podpisu oboma zmluvnými stranami.
    </p>
    <p>
      5.2 Vzťahy neupravené touto zmluvou sa spravujú príslušnými ustanoveniami Občianskeho zákonníka Slovenskej republiky.
    </p>

    <div class="signatures">
      <div class="sign-box">
        Za prenajímateľa (RESR, s.r.o.)<br>
        <strong>Alex Vance</strong>
      </div>
      <div class="sign-box">
        Za nájomcu<br>
        <strong>${tenantName}</strong>
      </div>
    </div>

    <div class="security-watermark">
      <span>Zabezpečené elektronickou archiváciou RESR Cloud Vault</span>
      <span>Generované dňa: ${new Date().toLocaleDateString('sk-SK')}</span>
    </div>
  </div>

</body>
</html>
  `;

  newWin.document.open();
  newWin.document.write(htmlContent);
  newWin.document.close();
}
