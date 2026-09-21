import jsPDF from 'jspdf';
import { Lease, Property } from '../types';
import { formatDate } from './date';

/**
 * Generates an actual binary application/pdf Blob and opens it
 * directly in the browser's native built-in PDF viewer (Chrome/Edge/Firefox PDF Viewer).
 */
export function openLeasePdfWindow(lease: Partial<Lease>, property?: Partial<Property>) {
  const tenantName = lease.tenantName || 'Nájomca';
  const tenantEmail = lease.tenantEmail || '—';
  const tenantPhone = lease.tenantPhone || '—';
  const propName = property?.name || lease.propertyName || 'Byt';
  const propUnit = property?.unitNumber || lease.propertyUnit || '1';
  const propAddress = property?.address || 'Hlavná ulica';
  const propCity = property?.city || 'Bratislava';
  const startDate = formatDate(lease.startDate || new Date().toISOString());
  const endDate = formatDate(lease.endDate || '');
  const rentTotal = Number(lease.rentAmount) || 0;
  const baseRent = Number(lease.baseRent ?? rentTotal);
  const utilities = Number(lease.utilitiesAmount ?? 0);
  const deposit = Number(lease.depositAmount) || rentTotal * 2;
  const contractId = lease.id || 'ZMLUVA-' + Date.now();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 22;

  // Header - Brand & Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('RESR', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('PORTFOLIO MANAGEMENT & SPRAVA NEHNUTELNOSTI', margin, y + 5);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cislo zmluvy: ${contractId}`, pageWidth - margin, y, { align: 'right' });
  doc.text(`Datum vystavenia: ${new Date().toLocaleDateString('sk-SK')}`, pageWidth - margin, y + 5, { align: 'right' });

  y += 10;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);

  // Document Heading
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('ZMLUVA O NAJME BYTU', pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('uzatvorena podla § 685 a nasl. Obcianskeho zakonnika SR', pageWidth / 2, y, { align: 'center' });

  // Parties Box
  y += 10;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  const halfWidth = contentWidth / 2;
  // Party 1: Landlord
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. PRENAJIMATEL', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Obchodne meno: RESR Management s.r.o.', margin + 4, y + 12);
  doc.text('Sidlo: Pribinova 19, 811 09 Bratislava', margin + 4, y + 17);
  doc.text('Zastupeny: Ing. Alex Vance, konatel', margin + 4, y + 22);
  doc.text('Email: info@resr.sk | Tel: +421 905 123 456', margin + 4, y + 27);
  doc.text('(dalej len ako "prenajimatel")', margin + 4, y + 32);

  // Party 2: Tenant
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. NAJOMCA', margin + halfWidth + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Meno a priezvisko: ${tenantName}`, margin + halfWidth + 4, y + 12);
  doc.text(`Email: ${tenantEmail}`, margin + halfWidth + 4, y + 17);
  doc.text(`Telefon: ${tenantPhone}`, margin + halfWidth + 4, y + 22);
  doc.text(`Objekt: ${propName} (c. ${propUnit})`, margin + halfWidth + 4, y + 27);
  doc.text('(dalej len ako "najomca")', margin + halfWidth + 4, y + 32);

  y += 44;

  // Sections helper
  const addSectionTitle = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 5;
  };

  const addParagraph = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitLines = doc.splitTextToSize(text, contentWidth);
    doc.text(splitLines, margin, y);
    y += splitLines.length * 4.2 + 2;
  };

  // Clanok I
  addSectionTitle('Clanok I. Predmet najmu a specifikacia nehnutelnosti');
  addParagraph(
    `1.1 Prenajimatel je vylucnym vlastnikom alebo opravnenym spravcom nehnutelnosti nachadzajucej sa na adrese: ${propAddress}, ${propCity}, specifikovanej ako byt c. ${propUnit} v projekte/budove ${propName}.`
  );
  addParagraph(
    '1.2 Prenajimatel touto zmluvou prenechava najomcovi do docasneho uzivania predmetny byt spolu s jeho prislusenstvom a vybavenim za ucelom byvania, a najomca predmet najmu v stave sposobilom na riadne uzivanie prijima.'
  );

  // Clanok II
  addSectionTitle('Clanok II. Doba trvania najmu');
  addParagraph(
    `2.1 Nájomny vztah sa uzatvara na dobu urcitu, a to so zaciatkom od ${startDate} do ${endDate || 'dohodou zmluvnych stran'}.`
  );
  addParagraph(
    '2.2 Nájom konci uplynutim dohodnutej doby najmu, pisomnou dohodou zmluvnych stran alebo pisomnou vypovedou za podmienok stanovenych Obcianskym zakonnikom SR.'
  );

  // Clanok III
  addSectionTitle('Clanok III. Najomne, zalohy za energie a platobne podmienky');
  addParagraph(
    `3.1 Celkova vyska mesacneho najomneho je stanovena dohodou zmluvnych stran na ciastku €${rentTotal.toLocaleString()} mesacne.`
  );
  addParagraph(
    `    - Ciste najomne (zaklad): €${baseRent.toLocaleString()} / mesacne\n    - Zalohove platby za energie a sluzby spojene s uzivanim bytu: €${utilities.toLocaleString()} / mesacne`
  );
  addParagraph(
    '3.2 Najomne a preddavky na sluzby su splatne vzdy vopred, najneskor do 20. dna kalendarneho mesiaca predchadzajuceho mesiacu, za ktory sa najomne plati, bezhotovostnym prevodom na bankovy ucet prenajimatela.'
  );

  // Clanok IV
  addSectionTitle('Clanok IV. Financna zaruka (Kaucia)');
  addParagraph(
    `4.1 Najomca zlozil prenajimatelovi penaznu zaruku (kauciu) vo vyske €${deposit.toLocaleString()} na zabezpecenie pripadnych pohladavok prenajimatela voci najomcovi vzniknutych z dovodu neplatenia najomneho alebo sposobenych skod na predmete najmu.`
  );
  addParagraph(
    '4.2 Kaucia bude najomcovi vratena v plnej vyske do 14 dni po protokolarnom odovzdani vyprataneho bytu na konci najmu po zapocitani e-pohladavok.'
  );

  // Clanok V
  addSectionTitle('Clanok V. Zaverecne ustanovenia');
  addParagraph(
    '5.1 Zmluva nadobuda platnost a ucinnost dnom podpisu oboma zmluvnymi stranami. Vztahy neupravene touto zmluvou sa spravuju Obcianskym zakonnikom Slovenskej republiky.'
  );

  // Signatures
  y = Math.max(y + 6, 245);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 65, y);
  doc.line(pageWidth - margin - 65, y, pageWidth - margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Za prenajimatela (RESR s.r.o.)', margin, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.text('Ing. Alex Vance', margin, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.text('Za najomcu', pageWidth - margin - 65, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(tenantName, pageWidth - margin - 65, y + 8);

  // Footer Watermark
  y = 280;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Zabezpecene elektronickou archivaciou RESR Cloud Vault', margin, y);
  doc.text(`Overene elektronickym podpisom RESR • Datum: ${new Date().toLocaleDateString('sk-SK')}`, pageWidth - margin, y, { align: 'right' });

  // Generate binary PDF Blob and open directly in browser's native PDF viewer
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
  window.open(blobUrl, '_blank');
}
