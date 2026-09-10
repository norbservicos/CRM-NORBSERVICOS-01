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
  ArrowRight
} from 'lucide-react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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
  const [clientName, setClientName] = useState('Mariana');
  const [clientPhone, setClientPhone] = useState('(31) 98353-8588');
  const [clientAddress, setClientAddress] = useState('Belo Horizonte - MG');

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
      description: 'Colchão casal TRADICIONAL (138 x 188 cm)',
      unit: 'Unid.',
      unitPrice: 280,
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
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

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
          address: [c.address, c.city].filter(Boolean).join(', ') || 'Belo Horizonte - MG',
          source: 'Cliente'
        });
      }
    });

    leads.forEach(l => {
      if (l.fullName?.toLowerCase().includes(q) || l.whatsappNumber?.includes(q) || l.selectedCity?.toLowerCase().includes(q)) {
        contactList.push({
          name: l.fullName,
          phone: l.whatsappNumber || '',
          address: l.selectedCity || 'Belo Horizonte - MG',
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

  // PDF Export
  const exportToPdf = async () => {
    if (!budgetRef.current) return;
    setGeneratingPdf(true);

    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function (elt, pseudoElt) {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target: any, prop: string | symbol) {
          const value = Reflect.get(target, prop);
          if (typeof value === 'function') {
            return function(this: any, ...args: any[]) {
              if (prop === 'getPropertyValue' && args[0]) {
                const propVal = target.getPropertyValue(args[0]);
                if (propVal && typeof propVal === 'string' && propVal.includes('oklch')) {
                  return 'rgba(0, 0, 0, 0)';
                }
                return propVal;
              }
              return value.apply(target, args);
            };
          }
          if (typeof value === 'string' && value.includes('oklch')) {
            return 'rgba(0, 0, 0, 0)';
          }
          return value;
        }
      }) as any;
    };

    try {
      const element = budgetRef.current;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (imgHeight > pdfHeight) {
        const ratio = pdfHeight / imgHeight;
        const finalWidth = pdfWidth * ratio;
        const finalHeight = pdfHeight;
        pdf.addImage(imgData, 'JPEG', (pdfWidth - finalWidth) / 2, 0, finalWidth, finalHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      }

      const fileName = `Orcamento_Norb_${clientName.trim().replace(/\s+/g, '_') || 'Cliente'}.pdf`;
      pdf.save(fileName);
      setShareFileName(fileName);
      setShowShareModal(true);
    } catch (err) {
      console.error('Erro ao gerar PDF do orçamento:', err);
      alert('Houve um erro ao gerar o PDF. Você também pode clicar no botão "Imprimir / Salvar PDF" para salvar diretamente pelo navegador.');
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
      setGeneratingPdf(false);
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
            onClick={exportToPdf}
            disabled={generatingPdf}
            className="px-5 py-2.5 bg-blue-900 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 cursor-pointer disabled:opacity-50"
          >
            {generatingPdf ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Gerando PDF...
              </span>
            ) : (
              <>
                <Download size={16} />
                <span>Baixar PDF</span>
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
                  placeholder="Ex: Mariana Silva"
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
                    placeholder="(31) 98353-8588"
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
                  placeholder="Ex: Bairro Belvedere, Belo Horizonte - MG"
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
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Descrição</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Ex: Colchão casal TRADICIONAL (138 x 188 cm)"
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
          <button
            type="button"
            onClick={exportToPdf}
            disabled={generatingPdf}
            className="w-full py-4 bg-blue-900 hover:bg-slate-900 text-white rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {generatingPdf ? (
              <span>Gerando PDF A4...</span>
            ) : (
              <>
                <Share2 size={20} />
                <span>Gerar e Enviar Orçamento</span>
              </>
            )}
          </button>
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
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <NorbLogoDocument />
                    )}
                  </div>
                  
                  <div className="pt-1 text-[13px] leading-snug">
                    <div className="font-black text-slate-900 tracking-tight text-base">NORB SERVIÇOS</div>
                    <div className="text-slate-600 font-medium">CNPJ: 58.852.280/0001-46</div>
                    <div className="text-slate-500 font-normal">Belo Horizonte e Região Metropolitana</div>
                    <div className="text-[12px] italic text-slate-500 font-medium pt-0.5">
                      Higienização Profissional de Estofados
                    </div>
                  </div>
                </div>

                {/* Header Right: Date + Contact */}
                <div className="text-right text-[12px] text-slate-600 space-y-1 pt-1">
                  <div className="font-bold text-slate-800 text-sm">{issueDate}</div>
                  <div>contato.norbservicos@gmail.com</div>
                  <div>Tel: (31) 98353-8588</div>
                  <div className="font-semibold text-slate-800">WhatsApp: (31) 98353-8588</div>
                  <div className="text-slate-500">Instagram: @norbservicos</div>
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
                    <span className="text-slate-700">{clientName || 'Cliente'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Tel: </span>
                    <span className="text-slate-700">{clientPhone || '(31) 98353-8588'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Endereço: </span>
                    <span className="text-slate-700">{clientAddress || 'Belo Horizonte - MG'}</span>
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
                            {item.description || 'Higienização Profissional'}
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

              {/* Section 6: Banners Pretos de Confiança (Como na foto) */}
              <div className="space-y-2 mb-6">
                {/* Banner 1: Rocha */}
                <div className="bg-black text-white text-center py-2.5 px-4 rounded-sm">
                  <h2 className="text-base sm:text-lg font-black tracking-wide uppercase font-sans">
                    Qualidade e confiança é como construir em uma rocha!
                  </h2>
                </div>

                {/* Banner 2: Padrão */}
                <div className="bg-black text-white text-center py-4 px-6 rounded-sm space-y-1">
                  <p className="text-sm sm:text-base font-light tracking-wide text-slate-100">
                    Eu não faço o certo só quando o cliente está olhando.
                  </p>
                  <p className="text-sm sm:text-base font-medium tracking-wide text-white">
                    Faço sempre porque esse é o meu padrão.
                  </p>
                </div>
              </div>

              {/* Document Footer Divider */}
              <div className="w-full h-0.5 bg-[#1e3a8a] mb-3" />

              {/* Document Footer Text */}
              <div className="text-center text-[11px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-700">
                  NORB SERVIÇOS • (31) 98353-8588 • contato.norbservicos@gmail.com
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Orçamento Pronto!</h3>
              <p className="text-slate-600 text-xs sm:text-sm">
                O arquivo <strong className="text-slate-900">{shareFileName}</strong> foi baixado no seu dispositivo.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-900">
                <Share2 size={13} /> Dica de envio ao cliente:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Clique abaixo para abrir a conversa no WhatsApp.</li>
                <li>Envie a mensagem com os valores e detalhes resumidos.</li>
                <li>Anexe o PDF que foi baixado no seu aparelho!</li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <a
                href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(clientPhone.replace(/\D/g, ''))}&text=${encodeURIComponent(
                  `Olá *${clientName.trim()}*, tudo bem?\n\n` +
                  `Aqui é da *NORB SERVIÇOS*! Segue o seu orçamento oficial:\n\n` +
                  `📋 *Orçamento:* ${budgetCode}\n` +
                  `🛋️ *Itens:* \n${items.map(i => `• ${i.description} (${i.quantity}x) - R$ ${(i.quantity * i.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')}\n\n` +
                  `💰 *Valor Total:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                  (pixDiscount > 0 ? `⚡ *Com desconto no Pix:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` : '') +
                  (cardInstallments ? `💳 *Cartão:* ${cardInstallments}\n` : '') +
                  `🛡️ *Garantia:* 72 horas para falhas de execução\n` +
                  `⏱️ *Secagem estimada:* 6 a 14 horas\n\n` +
                  `Estou enviando o arquivo PDF oficial em anexo. Podemos agendar o melhor dia para você?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
                className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-all text-sm cursor-pointer"
              >
                <Share2 size={18} />
                Enviar Mensagem no WhatsApp
              </a>

              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
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
