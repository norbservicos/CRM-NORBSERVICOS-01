import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileText,
  Share2,
  Printer,
  Download,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  PlusCircle,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Search,
  Zap,
  ArrowRight,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Send
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { CurrencyInput } from '../components/CurrencyInput';
import { NorbLogoDocument } from '../components/NorbLogoDocument';
import { useStore } from '../hooks/useStore';
import defaultLogoAsset from '../assets/images/norb_servicos_logo_1789047603995.jpg';

interface BudgetItem {
  id: string;
  description: string;
  unit: string;
  unitPrice: number;
  measurement: string;
  quantity: number;
}

const COMMON_PRESETS = [
  { description: 'Colchão casal TRADICIONAL (138 x 188 cm)', unit: 'Unid.', measurement: '138 x 188 cm', unitPrice: 280 },
  { description: 'Colchão QUEEN (158 x 198 cm)', unit: 'Unid.', measurement: '158 x 198 cm', unitPrice: 320 },
  { description: 'Colchão KING (193 x 203 cm)', unit: 'Unid.', measurement: '193 x 203 cm', unitPrice: 380 },
  { description: 'Sofá 2 Lugares Retrátil e Reclinável', unit: 'Unid.', measurement: 'Até 1.80m', unitPrice: 260 },
  { description: 'Sofá 3 Lugares Retrátil e Reclinável', unit: 'Unid.', measurement: 'Até 2.40m', unitPrice: 320 },
  { description: 'Sofá em L / Com Chaise', unit: 'Unid.', measurement: '3 a 4 Lug.', unitPrice: 390 },
  { description: 'Poltrona Individual', unit: 'Unid.', measurement: '-', unitPrice: 120 },
  { description: 'Cadeiras de Jantar (Assento e Encosto)', unit: 'Jogo', measurement: '4 Cadeiras', unitPrice: 160 },
  { description: 'Higienização Automotiva Completa (Bancos e Carpete)', unit: 'Veículo', measurement: 'Passeio', unitPrice: 350 }
];

export default function Budget() {
  const { clients, leads } = useStore();

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Budget Metadata
  const [budgetCode, setBudgetCode] = useState(() => `ORC-${Math.floor(1000000 + Math.random() * 9000000)}A`);
  const [issueDate, setIssueDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('pt-BR');
  });
  const [validityDays, setValidityDays] = useState(30);

  // Products / Items Table
  const [items, setItems] = useState<BudgetItem[]>([
    {
      id: '1',
      description: '',
      unit: 'Unid.',
      unitPrice: 0,
      measurement: '-',
      quantity: 1
    }
  ]);

  // Payment Options
  const [pixDiscount, setPixDiscount] = useState<number>(0);
  const [cardInstallments, setCardInstallments] = useState('');

  // Logo handling
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    return localStorage.getItem('norb_custom_budget_logo') || defaultLogoAsset;
  });
  const [logoMode, setLogoMode] = useState<'asset' | 'vector'>('asset');

  // UI States
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFileName, setShareFileName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
      try {
        const dummyFile = new File(['foo'], 'foo.pdf', { type: 'application/pdf' });
        setCanShareFiles(navigator.canShare({ files: [dummyFile] }));
      } catch {
        setCanShareFiles(false);
      }
    }
  }, []);

  const budgetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [items]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - pixDiscount);
  }, [subtotal, pixDiscount]);

  // Expiration date
  const expirationDate = useMemo(() => {
    const parts = issueDate.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      d.setDate(d.getDate() + validityDays);
      return d.toLocaleDateString('pt-BR');
    }
    const d = new Date();
    d.setDate(d.getDate() + validityDays);
    return d.toLocaleDateString('pt-BR');
  }, [issueDate, validityDays]);

  // Item helpers
  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substr(2, 9),
        description: '',
        unit: 'Unid.',
        unitPrice: 0,
        measurement: '-',
        quantity: 1
      }
    ]);
  };

  const addPreset = (preset: typeof COMMON_PRESETS[0]) => {
    // If there is an empty item, fill it, otherwise append
    const emptyIndex = items.findIndex(i => !i.description.trim() && i.unitPrice === 0);
    if (emptyIndex !== -1) {
      const updated = [...items];
      updated[emptyIndex] = {
        ...updated[emptyIndex],
        description: preset.description,
        unit: preset.unit,
        measurement: preset.measurement,
        unitPrice: preset.unitPrice,
        quantity: 1
      };
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          id: Math.random().toString(36).substr(2, 9),
          description: preset.description,
          unit: preset.unit,
          measurement: preset.measurement,
          unitPrice: preset.unitPrice,
          quantity: 1
        }
      ]);
    }
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    } else {
      setItems([{
        id: Math.random().toString(36).substr(2, 9),
        description: '',
        unit: 'Unid.',
        unitPrice: 0,
        measurement: '-',
        quantity: 1
      }]);
    }
  };

  const updateItem = (id: string, field: keyof BudgetItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Select client from CRM
  const filteredCrmContacts = useMemo(() => {
    if (!clientSearchQuery.trim()) return [];
    const q = clientSearchQuery.toLowerCase();
    const contactList: { name: string; phone: string; address: string; source: string }[] = [];

    clients.forEach(c => {
      if (c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.city?.toLowerCase().includes(q)) {
        contactList.push({
          name: c.name,
          phone: c.phone || '',
          address: [c.address, c.city].filter(Boolean).join(', ') || 'Coronel Fabriciano - MG',
          source: 'Cliente'
        });
      }
    });

    leads.forEach(l => {
      if (l.fullName?.toLowerCase().includes(q) || l.whatsappNumber?.includes(q) || l.selectedCity?.toLowerCase().includes(q)) {
        contactList.push({
          name: l.fullName,
          phone: l.whatsappNumber || '',
          address: l.selectedCity || 'Coronel Fabriciano - MG',
          source: 'Lead'
        });
      }
    });

    return contactList.slice(0, 5);
  }, [clients, leads, clientSearchQuery]);

  const selectContact = (contact: { name: string; phone: string; address: string }) => {
    setClientName(contact.name);
    if (contact.phone) setClientPhone(contact.phone);
    if (contact.address) setClientAddress(contact.address);
    setShowClientDropdown(false);
    setClientSearchQuery('');
  };

  // Custom logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setCustomLogo(result);
        localStorage.setItem('norb_custom_budget_logo', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetLogo = () => {
    setCustomLogo(defaultLogoAsset);
    localStorage.removeItem('norb_custom_budget_logo');
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Pre-formatted Message
  const whatsappMessage = useMemo(() => {
    const validItems = items.filter(i => i.description.trim());
    const itemsText = validItems.length > 0
      ? validItems.map(i => `• ${i.description} (${i.quantity}x) - R$ ${(i.quantity * i.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')
      : '• Higienização Profissional de Estofados';

    return (
      `Olá *${clientName.trim() || 'Cliente'}*, tudo bem?\n\n` +
      `Aqui é da *NORB SERVIÇOS*! Segue o seu orçamento oficial:\n\n` +
      `📋 *Orçamento:* ${budgetCode}\n` +
      `🛋️ *Itens:* \n${itemsText}\n\n` +
      `💰 *Valor Total:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      (pixDiscount > 0 ? `⚡ *Com desconto no Pix:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` : '') +
      (cardInstallments ? `💳 *Cartão:* ${cardInstallments}\n` : '') +
      `🛡️ *Garantia:* 72 horas para falhas de execução\n` +
      `⏱️ *Secagem estimada:* 6 a 14 horas\n` +
      `📅 *Validade:* ${validityDays} dias (até ${expirationDate})\n\n` +
      `Estou enviando o arquivo PDF oficial em anexo. Podemos agendar o melhor dia para você?`
    );
  }, [clientName, budgetCode, items, total, pixDiscount, cardInstallments, validityDays, expirationDate]);

  const whatsappUrl = useMemo(() => {
    const cleanPhone = clientPhone.replace(/\D/g, '');
    let phoneQuery = '';
    if (cleanPhone) {
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      phoneQuery = `&phone=${fullPhone}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}${phoneQuery}`;
  }, [clientPhone, whatsappMessage]);

  // High-precision, zero-crash vector PDF Generator using jsPDF + autoTable
  const createNorbBudgetPdf = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryColor: [number, number, number] = [30, 58, 138]; // #1e3a8a Navy Blue
    const slateDark: [number, number, number] = [15, 23, 42]; // #0f172a
    const slateMedium: [number, number, number] = [71, 85, 105]; // #475569
    const borderSlate: [number, number, number] = [226, 232, 240]; // #e2e8f0

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    let curY = 14;

    // Header Left: Logo & Company Info
    let logoPlaced = false;
    if (customLogo) {
      try {
        doc.addImage(customLogo, 'JPEG', margin, curY, 26, 14);
        logoPlaced = true;
      } catch {
        try {
          doc.addImage(customLogo, 'PNG', margin, curY, 26, 14);
          logoPlaced = true;
        } catch {
          logoPlaced = false;
        }
      }
    }

    const textStartX = logoPlaced ? margin + 30 : margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...primaryColor);
    doc.text('NORB SERVIÇOS', textStartX, curY + (logoPlaced ? 4.5 : 5.5));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slateMedium);
    doc.text('CNPJ: 58.852.280/0001-46', textStartX, curY + (logoPlaced ? 8.5 : 10));
    doc.text('Coronel Fabriciano e Região', textStartX, curY + (logoPlaced ? 12 : 14));
    doc.setFont('helvetica', 'italic');
    doc.text('Higienização Profissional de Estofados', textStartX, curY + (logoPlaced ? 15.5 : 18));

    // Header Right: Date, Contact & Social
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...slateDark);
    doc.text(issueDate, pageWidth - margin, curY + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slateMedium);
    doc.text('norbservicos25@gmail.com', pageWidth - margin, curY + 8, { align: 'right' });
    doc.text('Tel: (31) 98353-8588', pageWidth - margin, curY + 11.8, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text('WhatsApp: (31) 98353-8588', pageWidth - margin, curY + 15.6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text('Instagram: @norb_servicos', pageWidth - margin, curY + 19.4, { align: 'right' });

    curY += 23;

    // Horizontal Accent Navy Divider Line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(margin, curY, pageWidth - margin, curY);

    curY += 4;

    const drawSectionHeader = (title: string, y: number) => {
      doc.setFillColor(...primaryColor);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 4, y + 4.2);
      return y + 6;
    };

    // 1. Orçamento Box (Client, Phone, Address)
    const yBox1 = drawSectionHeader(`Orçamento ${budgetCode}`, curY);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderSlate);
    doc.setLineWidth(0.2);
    doc.rect(margin, yBox1, contentWidth, 16, 'DF');
    doc.setFontSize(8);
    doc.setTextColor(...slateDark);

    doc.setFont('helvetica', 'bold');
    doc.text('Cliente: ', margin + 4, yBox1 + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.text(clientName.trim() || '-', margin + 17, yBox1 + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.text('Tel: ', margin + 4, yBox1 + 9.2);
    doc.setFont('helvetica', 'normal');
    doc.text(clientPhone.trim() || '-', margin + 17, yBox1 + 9.2);

    doc.setFont('helvetica', 'bold');
    doc.text('Endereço: ', margin + 4, yBox1 + 13.6);
    doc.setFont('helvetica', 'normal');
    doc.text(clientAddress.trim() || '-', margin + 21, yBox1 + 13.6);

    curY = yBox1 + 19;

    // 2. Informações Básicas (Validade)
    const yBox2 = drawSectionHeader('Informações Básicas', curY);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderSlate);
    doc.setLineWidth(0.2);
    doc.rect(margin, yBox2, contentWidth, 7, 'DF');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateDark);
    doc.text('Validade: ', margin + 4, yBox2 + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${validityDays} dias (até ${expirationDate})`, margin + 18, yBox2 + 4.8);

    curY = yBox2 + 10;

    // 3. Produtos / Serviços Table
    const yBox3 = drawSectionHeader('Produtos', curY);

    const tableBody = items.map((item) => [
      item.description || '-',
      item.unit || 'Unid.',
      `R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      item.measurement || '-',
      String(item.quantity),
      `R$ ${(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: yBox3,
      margin: { left: margin, right: margin },
      head: [['Descrição', 'Unidade', 'Preço Unit.', 'Medida', 'Qtd.', 'Preço']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        fontSize: 7.5,
        lineWidth: { bottom: 0.2 },
        lineColor: [226, 232, 240]
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [15, 23, 42],
        lineWidth: { bottom: 0.1 },
        lineColor: [241, 245, 249]
      },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 28 }
      },
      styles: { cellPadding: 2 }
    });

    const tabEnd = (doc as any).lastAutoTable?.finalY || (yBox3 + 20);

    // Subtotal, Desconto Pix and Total Box
    doc.setDrawColor(...borderSlate);
    doc.setLineWidth(0.2);
    doc.line(margin, tabEnd, pageWidth - margin, tabEnd);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateMedium);
    doc.text('Subtotal:', pageWidth - margin - 50, tabEnd + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(`R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, tabEnd + 4.5, { align: 'right' });

    let curTotalY = tabEnd + 6;
    if (pixDiscount > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...primaryColor);
      doc.text('Desconto Pix:', pageWidth - margin - 50, curTotalY + 3.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`- R$ ${pixDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, curTotalY + 3.5, { align: 'right' });
      curTotalY += 5;
    }

    // TOTAL Banner
    const totalBoxWidth = 80;
    const totalBoxHeight = 8;
    const totalBoxX = pageWidth - margin - totalBoxWidth;
    const totalBoxY = curTotalY + 1;

    doc.setFillColor(...primaryColor);
    doc.roundedRect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totalBoxX + 4, totalBoxY + 5.5);
    doc.text(`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totalBoxX + totalBoxWidth - 4, totalBoxY + 5.5, { align: 'right' });

    let afterTotalY = totalBoxY + totalBoxHeight + 2;
    if (cardInstallments) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slateMedium);
      doc.text(`Cartão de Crédito: ${cardInstallments}`, pageWidth - margin - 4, afterTotalY + 3, { align: 'right' });
      afterTotalY += 5;
    }

    curY = afterTotalY + 4;

    // 4. Garantia
    const yBox4 = drawSectionHeader('Garantia', curY);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderSlate);
    doc.setLineWidth(0.2);
    doc.rect(margin, yBox4, contentWidth, 7, 'DF');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateDark);
    doc.text('Higienização com garantia de 72 horas para falhas de execução.', margin + 4, yBox4 + 4.6);

    curY = yBox4 + 10;

    // 5. Termos e Condições
    const yBox5 = drawSectionHeader('Termos e Condições', curY);
    const termsH = 21;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderSlate);
    doc.setLineWidth(0.2);
    doc.rect(margin, yBox5, contentWidth, termsH, 'DF');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateMedium);
    const terms = [
      '1. É necessário acesso à água e energia elétrica no local.',
      '2. O pagamento deverá ser realizado ao final do serviço, conforme proposta aprovada.',
      '3. Os resultados variam conforme o estado do tecido, não sendo garantida a remoção total de manchas profundas ou desgaste natural.',
      '4. O tempo de secagem é estimado, variando entre 6 e 14 horas, podendo ser menor em dias quentes ou ambientes bem ventilados.'
    ];
    let termY = yBox5 + 4;
    terms.forEach((t) => {
      doc.text(t, margin + 4, termY);
      termY += 4.2;
    });

    // Footer (Fixed near bottom)
    const footerY = pageHeight - 16;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text('NORB SERVIÇOS  •  (31) 98353-8588  •  norbservicos25@gmail.com', pageWidth / 2, footerY + 4, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateMedium);
    doc.text('Estofados limpos e com garantia de verdade. Entre em contato para mais informações.', pageWidth / 2, footerY + 7.8, { align: 'center' });
    doc.text('Página 1 de 1', pageWidth - margin, footerY + 11, { align: 'right' });

    return doc;
  };

  // Safe PDF Export & Share
  const exportToPdf = async (triggerDirectShare = false) => {
    setGeneratingPdf(true);

    try {
      // Build pure vector PDF (instant, zero DOM / canvas bugs on iOS or Android)
      const pdf = await createNorbBudgetPdf();

      const sanitizedClient = clientName.trim().replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '_') || 'Cliente';
      const fileName = `Orcamento_Norb_${sanitizedClient}.pdf`;
      const blob = pdf.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);

      setPdfFile(file);
      setPdfUrl(objectUrl);
      setShareFileName(fileName);

      // On Mobile: If user requested direct share via native WhatsApp/Share sheet
      if (triggerDirectShare && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Orçamento Norb - ${clientName.trim() || 'Cliente'}`,
            text: `Olá ${clientName.trim() || ''}! Segue o seu orçamento oficial da Norb Serviços.`
          });
          setShowShareModal(false);
          return { file, objectUrl, fileName };
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            setShowShareModal(false);
            return { file, objectUrl, fileName };
          }
        }
      }

      // If on desktop or standard download requested, download cleanly
      if (!triggerDirectShare) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setShowShareModal(true);
      return { file, objectUrl, fileName };
    } catch (err) {
      console.error('Erro ao gerar PDF do orçamento:', err);
      alert('Não foi possível gerar o PDF: ' + (err instanceof Error ? err.message : String(err)) + '. Utilize o botão "Imprimir / Salvar A4" para salvar como PDF.');
      return null;
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Direct Share PDF File (WhatsApp / Mobile Share Sheet)
  const handleShareFileDirect = async () => {
    if (pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Orçamento Norb - ${clientName.trim() || 'Cliente'}`,
          text: `Olá ${clientName.trim() || ''}! Segue o orçamento oficial da Norb Serviços.`
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback: download PDF and open WhatsApp
    handleDownloadAgain();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadAgain = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = shareFileName || 'Orcamento_Norb.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-900/20">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Orçamento Norb Serviços
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Modelo oficial para higienização profissional de estofados em folha A4.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            title="Imprimir ou salvar em PDF de alta resolução"
          >
            <Printer size={16} className="text-slate-600" />
            <span>Imprimir / Salvar A4</span>
          </button>

          <button
            onClick={() => exportToPdf(false)}
            disabled={generatingPdf}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Baixar arquivo PDF no dispositivo"
          >
            <Download size={16} className="text-slate-600" />
            <span>Baixar PDF</span>
          </button>

          <button
            onClick={() => exportToPdf(true)}
            disabled={generatingPdf}
            className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#25D366]/20 cursor-pointer disabled:opacity-50"
            title="Gerar PDF e compartilhar no WhatsApp"
          >
            {generatingPdf ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Gerando PDF...
              </span>
            ) : (
              <>
                <MessageCircle size={16} />
                <span>Compartilhar no WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Form Controls (Left) + Document Preview (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Controls Column (Left) */}
        <div className="xl:col-span-5 space-y-6 print:hidden">
          
          {/* Quick CRM Auto-fill */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Search size={14} className="text-blue-900" />
                Preencher com Cliente / Lead Salvo
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou cidade..."
                value={clientSearchQuery}
                onChange={(e) => {
                  setClientSearchQuery(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
              />
              {showClientDropdown && filteredCrmContacts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100">
                  {filteredCrmContacts.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectContact(c)}
                      className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.phone} • {c.address}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {c.source}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Client Information Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <User size={16} className="text-blue-900" />
              1. Dados do Cliente
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo do cliente"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(31) 99999-9999"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Código do Orçamento</label>
                  <input
                    type="text"
                    value={budgetCode}
                    onChange={(e) => setBudgetCode(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold focus:ring-2 focus:ring-blue-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Endereço / Local do Atendimento</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Ex: Bairro Centro, Coronel Fabriciano - MG"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Emissão</label>
                  <input
                    type="text"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Validade (dias)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={validityDays}
                    onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 30)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-900 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Products & Services Items */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-900" />
                2. Produtos e Serviços
              </h3>
              <button
                onClick={addItem}
                className="text-xs font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle size={14} /> Adicionar Item
              </button>
            </div>

            {/* Quick Presets */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" /> Clique para adicionar rapidamente:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addPreset(preset)}
                    className="text-[11px] bg-white hover:bg-slate-900 hover:text-white text-slate-700 px-2.5 py-1.5 rounded-lg font-medium border border-slate-200 transition-all cursor-pointer text-left shrink-0"
                  >
                    {preset.description.split('(')[0].trim()} - R$ {preset.unitPrice}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Form */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                      title={items.length > 1 ? "Remover item" : "Limpar item"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Descrição</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Ex: Higienização de Estofados, Sofá 3 lugares..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Unidade</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        placeholder="Unid."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Medida</label>
                      <input
                        type="text"
                        value={item.measurement}
                        onChange={(e) => updateItem(item.id, 'measurement', e.target.value)}
                        placeholder="-"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Qtd.</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Preço Unit.</label>
                      <CurrencyInput
                        value={item.unitPrice}
                        onChange={(val) => updateItem(item.id, 'unitPrice', val)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right"
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs font-bold text-blue-900 pt-1">
                    Subtotal do Item: R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Discounts */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-600">Subtotal:</span>
                <span className="font-black text-slate-900">
                  R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Desconto Especial / Pix (R$)</span>
                  <span className="text-[10px] text-blue-900 font-bold">Opcional</span>
                </label>
                <CurrencyInput
                  value={pixDiscount}
                  onChange={setPixDiscount}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Condição no Cartão de Crédito
                </label>
                <input
                  type="text"
                  value={cardInstallments}
                  onChange={(e) => setCardInstallments(e.target.value)}
                  placeholder={`Ex: R$ ${(subtotal > 0 ? subtotal : 280).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até 5x`}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between">
                <span className="text-xs font-black text-blue-950 uppercase">Valor Total do Orçamento:</span>
                <span className="text-lg font-black text-blue-900">
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Logo & Company Customization */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={14} className="text-blue-900" />
              Logotipo da Norb Serviços
            </h3>
            
            <div className="flex items-center gap-3">
              <div className="w-16 h-12 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden p-1">
                {customLogo ? (
                  <img src={customLogo} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <NorbLogoDocument />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Trocar Imagem
                  </button>
                  {customLogo && (
                    <button
                      type="button"
                      onClick={resetLogo}
                      className="px-3 py-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Padrão
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-[10px] text-slate-400">
                  Suporta PNG transparente, JPG ou o logo padrão Norb.
                </p>
              </div>
            </div>
          </div>

          {/* Share Action */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => exportToPdf(true)}
              disabled={generatingPdf}
              className="w-full py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-[#25D366]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {generatingPdf ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Gerando PDF...
                </span>
              ) : (
                <>
                  <MessageCircle size={22} />
                  <span>Gerar e Compartilhar no WhatsApp</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => exportToPdf(false)}
              disabled={generatingPdf}
              className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={17} className="text-slate-600" />
              <span>Apenas Baixar Arquivo PDF</span>
            </button>
          </div>
        </div>

        {/* Document Preview (Right Column - Exact A4 Sheet as in User Photo) */}
        <div className="xl:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[794px] space-y-3">
            <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400 print:hidden">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <FileText size={13} className="text-blue-900" />
                Prévia da Folha A4 Oficial (Padrão Norb)
              </span>
              <span>210mm × 297mm</span>
            </div>

            {/* The Actual Printable / Exportable Sheet */}
            <div 
              ref={budgetRef}
              id="budget-document"
              className="bg-white w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-slate-800 transition-all print:shadow-none print:border-none print:rounded-none"
              style={{
                minHeight: '1120px',
                padding: '40px 48px',
                fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              {/* Document Header (Top Row) */}
              <div className="flex justify-between items-start gap-4 pb-3">
                {/* Header Left: Logo + Company Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {customLogo ? (
                      <img
                        src={customLogo}
                        alt="Norb Serviços"
                        className="h-16 w-auto max-w-[220px] object-contain"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <NorbLogoDocument />
                    )}
                  </div>
                  
                  <div className="pt-1 text-[13px] leading-snug">
                    <div className="font-black text-slate-900 tracking-tight text-base">NORB SERVIÇOS</div>
                    <div className="text-slate-600 font-medium">CNPJ: 58.852.280/0001-46</div>
                    <div className="text-slate-500 font-normal">Coronel Fabriciano e Região</div>
                    <div className="text-[12px] italic text-slate-500 font-medium pt-0.5">
                      Higienização Profissional de Estofados
                    </div>
                  </div>
                </div>

                {/* Header Right: Date + Contact */}
                <div className="text-right text-[12px] text-slate-600 space-y-1 pt-1">
                  <div className="font-bold text-slate-800 text-sm">{issueDate}</div>
                  <div>norbservicos25@gmail.com</div>
                  <div>Tel: (31) 98353-8588</div>
                  <div className="font-semibold text-slate-800">WhatsApp: (31) 98353-8588</div>
                  <div className="text-slate-500">Instagram: @norb_servicos</div>
                </div>
              </div>

              {/* Accent Navy Blue Top Line */}
              <div className="w-full h-1 bg-[#1e3a8a] my-4 rounded-full" />

              {/* Section 1: Orçamento ORC-XXXXX (Client Details) */}
              <div className="mb-4">
                <div className="bg-[#1e3a8a] text-white px-4 py-1.5 font-bold text-sm rounded-t-md tracking-wide">
                  Orçamento {budgetCode}
                </div>
                <div className="border border-t-0 border-slate-200 p-3.5 rounded-b-md text-xs space-y-1 bg-white">
                  <div>
                    <span className="font-bold text-slate-800">Cliente: </span>
                    <span className="text-slate-700">{clientName || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Tel: </span>
                    <span className="text-slate-700">{clientPhone || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Endereço: </span>
                    <span className="text-slate-700">{clientAddress || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Informações Básicas */}
              <div className="mb-4">
                <div className="bg-[#1e3a8a] text-white px-4 py-1.5 font-bold text-sm rounded-t-md tracking-wide">
                  Informações Básicas
                </div>
                <div className="border border-t-0 border-slate-200 p-3.5 rounded-b-md text-xs bg-white">
                  <span className="text-slate-700">
                    Validade: <strong className="text-slate-900">{validityDays} dias</strong> (até {expirationDate})
                  </span>
                </div>
              </div>

              {/* Section 3: Produtos / Serviços Table */}
              <div className="mb-4">
                <div className="bg-[#1e3a8a] text-white px-4 py-1.5 font-bold text-sm rounded-t-md tracking-wide">
                  Produtos
                </div>
                <div className="border border-t-0 border-slate-200 rounded-b-md overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50/50">
                        <th className="py-2.5 px-3">Descrição</th>
                        <th className="py-2.5 px-3 text-center">Unidade</th>
                        <th className="py-2.5 px-3 text-right">Preço Unit.</th>
                        <th className="py-2.5 px-3 text-center">Medida</th>
                        <th className="py-2.5 px-3 text-center">Qtd.</th>
                        <th className="py-2.5 px-3 text-right">Preço</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/30">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {item.description || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            {item.unit || 'Unid.'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                            R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {item.measurement || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Subtotal and Total Banner */}
                  <div className="p-3 border-t border-slate-200 bg-white space-y-2">
                    <div className="flex justify-end items-center gap-12 pr-2 text-xs font-semibold text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-bold text-slate-900 min-w-[80px] text-right">
                        R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {pixDiscount > 0 && (
                      <div className="flex justify-end items-center gap-12 pr-2 text-xs font-semibold text-blue-900">
                        <span>Desconto Pix:</span>
                        <span className="font-bold min-w-[80px] text-right">
                          - R$ {pixDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <div className="bg-[#1e3a8a] text-white px-6 py-2 rounded-md font-bold text-base flex items-center justify-between w-full max-w-[280px] shadow-sm">
                        <span>TOTAL:</span>
                        <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {cardInstallments && (
                      <div className="text-right text-[11px] text-slate-500 pr-2 pt-0.5">
                        Cartão de Crédito: <strong className="text-slate-700">{cardInstallments}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Garantia */}
              <div className="mb-4">
                <div className="bg-[#1e3a8a] text-white px-4 py-1.5 font-bold text-sm rounded-t-md tracking-wide">
                  Garantia
                </div>
                <div className="border border-t-0 border-slate-200 p-3.5 rounded-b-md text-xs leading-relaxed text-slate-700 bg-white">
                  Higienização com garantia de 72 horas para falhas de execução.
                </div>
              </div>

              {/* Section 5: Termos e Condições */}
              <div className="mb-5">
                <div className="bg-[#1e3a8a] text-white px-4 py-1.5 font-bold text-sm rounded-t-md tracking-wide">
                  Termos e Condições
                </div>
                <div className="border border-t-0 border-slate-200 p-3.5 rounded-b-md text-xs leading-relaxed text-slate-700 space-y-1.5 bg-white">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-900 shrink-0">1.</span>
                    <span>É necessário acesso à água e energia elétrica no local.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-900 shrink-0">2.</span>
                    <span>O pagamento deverá ser realizado ao final do serviço, conforme proposta aprovada.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-900 shrink-0">3.</span>
                    <span>Os resultados variam conforme o estado do tecido, não sendo garantida a remoção total de manchas profundas ou desgaste natural.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-900 shrink-0">4.</span>
                    <span>O tempo de secagem é estimado, variando entre 6 e 14 horas, podendo ser menor em dias quentes ou ambientes bem ventilados.</span>
                  </div>
                </div>
              </div>

              {/* Document Footer Divider */}
              <div className="w-full h-0.5 bg-[#1e3a8a] mb-3" />

              {/* Document Footer Text */}
              <div className="text-center text-[11px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-700">
                  NORB SERVIÇOS • (31) 98353-8588 • norbservicos25@gmail.com
                </div>
                <div className="text-[10px] text-slate-400">
                  Estofados limpos e com garantia de verdade. Entre em contato para mais informações.
                </div>
                <div className="text-[9px] text-slate-400 pt-1 flex justify-end">
                  Página 1 de 1
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Share / WhatsApp Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">PDF Gerado com Sucesso!</h3>
              <p className="text-slate-600 text-xs sm:text-sm">
                O arquivo <strong className="text-slate-900">{shareFileName}</strong> está pronto para envio ao cliente.
              </p>
            </div>

            {/* WhatsApp Direct Actions */}
            <div className="space-y-3">
              {/* Option A: Direct File Share (Mobile / Web Share API) */}
              <button
                type="button"
                onClick={handleShareFileDirect}
                className="w-full py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-2xl font-bold text-center flex items-center justify-center gap-3 shadow-xl shadow-[#25D366]/25 transition-all text-sm sm:text-base cursor-pointer"
              >
                <MessageCircle size={22} />
                <span>Enviar Arquivo PDF no WhatsApp</span>
              </button>

              {/* Option B: Open WhatsApp with Formatted Text */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-center flex items-center justify-center gap-2 transition-all text-xs sm:text-sm cursor-pointer"
              >
                <ExternalLink size={16} />
                <span>Abrir WhatsApp com Resumo dos Valores</span>
              </a>

              {/* Option C: Copy text & Download Again */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedSummary ? (
                    <>
                      <Check size={15} className="text-emerald-600" />
                      <span className="text-emerald-700">Texto Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>Copiar Resumo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAgain}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={15} />
                  <span>Baixar Novamente</span>
                </button>
              </div>
            </div>

            {/* Instruction Tip */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5 text-blue-900 uppercase tracking-wider">
                <Share2 size={13} /> Como enviar ao cliente:
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                <strong>No celular:</strong> O botão verde acima abre o WhatsApp diretamente com o PDF anexado pronto para enviar.
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                <strong>No computador:</strong> O PDF já foi salvo na sua pasta de Downloads. Clique em "Abrir WhatsApp" e anexe o documento na conversa!
              </p>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Embedded Print Styling */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
          }
          nav, aside, header, .print\\:hidden {
            display: none !important;
          }
          #budget-document {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
