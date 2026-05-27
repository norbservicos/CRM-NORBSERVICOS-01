import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText,
  Share2,
  CreditCard,
  User,
  Zap,
  ClipboardList,
  Loader2,
  PlusCircle,
  Trash2,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { cn } from '../utils/utils';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const PREDEFINED_SERVICES = [
  { label: 'Montagem/Desmontagem', text: 'Montagem desmontagem sofá', icon: '🛠️' },
  { label: 'Aspiração Completa', text: 'Aspiração completa do estofado', icon: '🧹' },
  { label: 'Flotação (Limpeza)', text: 'Flotação (Limpeza profunda e superficial do sofá)', icon: '💧' },
  { label: 'Higienização (Acaros/Fungos)', text: 'Higienização (desinfecção de acaros, bacterias e fungos)', icon: '🔬' },
  { label: 'Aromatizante', text: 'Aromatizante (Neutralizador de odores)', icon: '🌸' }
];

interface ServiceItem {
  id: string;
  description: string;
}

export default function Budget() {
  const [clientName, setClientName] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([{ id: '1', description: '' }]);
  const [totalPrice, setTotalPrice] = useState(''); // New global total price
  const [pixDiscount, setPixDiscount] = useState('0'); // Discount for Pix in R$ or % (now in R$)
  const [cardInfo, setCardInfo] = useState(''); // Custom card info
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFileName, setShareFileName] = useState('');

  const budgetRef = useRef<HTMLDivElement>(null);
  const lastTotalPriceRef = useRef('');

  useEffect(() => {
    const total = parseFloat(totalPrice) || 0;
    if (totalPrice !== lastTotalPriceRef.current) {
      lastTotalPriceRef.current = totalPrice;
      if (total > 0) {
        setCardInfo(`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até 5x`);
      } else {
        setCardInfo('');
      }
    }
  }, [totalPrice]);

  const addService = () => {
    setServices([...services, { id: Math.random().toString(36).substr(2, 9), description: '' }]);
  };

  const addPredefinedService = (description: string) => {
    // Look for first item that is empty
    const emptyIndex = services.findIndex(s => !s.description.trim());
    if (emptyIndex !== -1) {
      const newServices = [...services];
      newServices[emptyIndex] = { ...newServices[emptyIndex], description };
      setServices(newServices);
    } else {
      setServices([...services, { id: Math.random().toString(36).substr(2, 9), description }]);
    }
  };

  const removeService = (id: string) => {
    if (services.length > 1) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const updateService = (id: string, field: keyof ServiceItem, value: string) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const getTotal = () => {
    return parseFloat(totalPrice) || 0;
  };

  const getPixTotal = () => {
    const total = getTotal();
    const discount = parseFloat(pixDiscount) || 0;
    return Math.max(0, total - discount);
  };

  const exportToPdf = async () => {
    if (!budgetRef.current) return;
    setGeneratingPdf(true);
    
    // Safety monkeypatch for oklch support in html2canvas
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
      if (!element) return;

      // Ensure the capture starts from the top
      window.scrollTo(0, 0);
      
      const canvas = await html2canvas(element, {
        scale: 1.5, // Lower scale for better compatibility/memory usage
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // If content is larger than one page, scale it down to fit
      if (imgHeight > pdfHeight) {
        const ratio = pdfHeight / imgHeight;
        const finalWidth = pdfWidth * ratio;
        const finalHeight = pdfHeight;
        pdf.addImage(imgData, 'JPEG', (pdfWidth - finalWidth) / 2, 0, finalWidth, finalHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      }
      
      const fileName = `Orcamento_${clientName.trim().replace(/\s+/g, '_') || 'Cliente'}.pdf`;
      pdf.save(fileName);
      setShareFileName(fileName);
      setShowShareModal(true);
    } catch (err) {
      console.error('Erro detalhado ao gerar PDF:', err);
      alert('Houve um erro ao gerar o PDF. Tente preencher novamente ou use outro navegador.');
    } finally {
      // Clean up/restore original methods
      window.getComputedStyle = originalGetComputedStyle;
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-900" size={32} />
            Gerador de Orçamento
          </h1>
          <p className="text-slate-500 mt-1">Crie e compartilhe orçamentos profissionais em segundos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Form Section */}
        <div className="space-y-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                <User size={12} /> Cliente
              </label>
              <input
                type="text"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-900/10 rounded-2xl font-bold transition-all"
              />
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                  <ClipboardList size={12} /> Serviços/Itens
                </label>
                <button 
                  onClick={addService}
                  className="text-blue-900 font-bold text-xs flex items-center gap-1 hover:underline"
                >
                  <PlusCircle size={14} /> Adicionar Item
                </button>
              </div>

              {/* Serviços Rápidos */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-2">
                <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-1 ml-1 select-none">
                  ⚡ Serviços Rápidos (Clique para adicionar):
                </p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_SERVICES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addPredefinedService(item.text)}
                      className="text-[11px] bg-white hover:bg-slate-900 hover:text-white text-slate-800 px-3 py-2 rounded-2xl font-bold border border-slate-200 shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {services.map((service, index) => (
                <div key={service.id} className="flex gap-2 group">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Descrição do serviço"
                      value={service.description}
                      onChange={(e) => updateService(service.id, 'description', e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-900/10 rounded-2xl font-bold text-sm"
                    />
                  </div>
                  {services.length > 1 && (
                    <button 
                      onClick={() => removeService(service.id)}
                      className="p-4 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                <DollarSign size={12} /> Valor Total do Orçamento (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 250,00"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full p-4 bg-slate-900 text-white border-2 border-transparent focus:border-blue-400 rounded-2xl font-bold transition-all"
              />
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                <CreditCard size={12} /> Condições no Cartão (Ex: R$250 de 5x)
              </label>
              <input
                type="text"
                placeholder={getTotal() > 0 ? `R$ ${getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até 5x` : "Ex: R$250 de 5x"}
                value={cardInfo}
                onChange={(e) => setCardInfo(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-900/10 rounded-2xl font-bold transition-all"
              />
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                <Zap size={12} /> Desconto para Pix/Dinheiro (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 20,00"
                value={pixDiscount}
                onChange={(e) => setPixDiscount(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-900/10 rounded-2xl font-bold transition-all"
              />
            </div>
          </div>

          <button
            onClick={exportToPdf}
            disabled={generatingPdf || !clientName}
            className="w-full py-5 bg-blue-900 text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingPdf ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Share2 size={24} />
                Enviar Orçamento (WhatsApp/PDF)
              </>
            )}
          </button>
        </div>

        {/* Preview Section */}
        <div className="sticky top-8 space-y-6">
          <div className="flex items-center justify-between px-4">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Prévia do Documento</span>
             <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
             </div>
          </div>
          
          <div 
            ref={budgetRef}
            id="budget-document"
            style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#f1f5f9' }}
            className="bg-white p-12 space-y-10 w-full rounded-3xl border min-h-[800px] flex flex-col"
          >
            {/* PDF Header */}
            <div className="flex justify-between items-start pb-10 border-b" style={{ borderColor: '#f1f5f9' }}>
               <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center rotate-3" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                  <Sparkles size={32} style={{ color: '#ffffff' }} />
                </div>
                <div>
                  <h3 className="font-black text-3xl tracking-tighter" style={{ color: '#0f172a' }}>NORB PRO</h3>
                  <p className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block uppercase tracking-widest mt-1" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>Sua Marca Aqui</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Data de Emissão</p>
                <p className="text-xl font-black" style={{ color: '#0f172a' }}>{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Client Info */}
            <div className="p-8 rounded-3xl flex items-center justify-between" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Orçamento para</span>
                <h4 className="text-2xl font-black mt-1" style={{ color: '#ffffff' }}>{clientName || 'Nome do Cliente'}</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Documento Nº</span>
                <p className="text-sm font-black" style={{ color: '#ffffff' }}>#BUD-{Math.floor(Math.random() * 10000)}</p>
              </div>
            </div>

            {/* Service List */}
            <div className="flex-1 space-y-6">
              <div className="pb-4 border-b" style={{ borderColor: '#f1f5f9' }}>
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>Descrição dos Serviços</div>
              </div>

              <div className="space-y-4">
                {services.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#1e3a8a' }} />
                    <p className="font-bold leading-tight" style={{ color: '#334155' }}>{item.description || 'Descrição do item...'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Footer */}
            <div className="space-y-4 pt-10 border-t" style={{ borderColor: '#f1f5f9' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pix Choice */}
                <div className="p-6 rounded-3xl relative overflow-hidden" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={64} style={{ color: '#ffffff' }} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3" style={{ color: '#bfdbfe' }}>
                      <Zap size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Pix ou Dinheiro</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight" style={{ color: '#ffffff' }}>
                      R$ {getPixTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] font-bold mt-2 uppercase tracking-wide" style={{ color: '#93c5fd' }}>
                      Com R$ {(parseFloat(pixDiscount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de desconto
                    </p>
                  </div>
                </div>

                {/* Credit Card Choice */}
                <div className="p-6 rounded-3xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={16} style={{ color: '#94a3b8' }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>Cartão de Crédito</span>
                  </div>
                  <p className={cn(
                    "font-black tracking-tight",
                    (cardInfo || getTotal() > 0) ? (cardInfo.length > 15 ? "text-xl" : "text-3xl") : "text-3xl"
                  )} style={{ color: '#0f172a' }}>
                    {cardInfo || `R$ ${getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </p>
                  <p className="text-[9px] font-bold mt-2 uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    {cardInfo ? "Condição personalizada" : "Valor padrão sem descontos"}
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl mt-4" style={{ backgroundColor: '#f8fafc' }}>
                <p className="text-[10px] font-black uppercase mb-2" style={{ color: '#94a3b8' }}>Informações Adicionais</p>
                <p className="text-[11px] leading-relaxed font-medium" style={{ color: '#475569' }}>
                  Este orçamento é válido por 7 dias a partir da data de emissão. 
                  Para pagamentos via Pix, utilize nossa chave cadastrada. 
                  Parcelamentos no cartão estão sujeitos a taxas da operadora.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 flex justify-between items-center" style={{ opacity: 0.35 }}>
              <p className="text-[9px] font-black tracking-widest" style={{ color: '#0f172a' }}>PLATAFORMA NORB GESTÃO PRO</p>
              <p className="text-[9px] font-bold italic" style={{ color: '#0f172a' }}>Profissionalismo & Tecnologia</p>
            </div>
          </div>
        </div>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 space-y-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Orçamento Baixado!</h3>
              <p className="text-slate-500 text-sm">
                O arquivo <strong className="text-slate-800 break-all">{shareFileName}</strong> foi baixado e salvo no seu aparelho com sucesso.
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-3">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-blue-900 flex items-center gap-1">
                💬 Como enviar no WhatsApp:
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Clique no botão abaixo para abrir o WhatsApp.</li>
                <li>Selecione o contato / cliente desejado.</li>
                <li>O texto explicativo de resumo será enviado.</li>
                <li>Anexe o PDF que foi baixado em seu aparelho!</li>
              </ol>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Olá! Segue o orçamento de *${clientName.trim()}*:\n\n` +
                  `*Serviços:*\n${services.map(s => `• ${s.description || 'Sem descrição'}`).join('\n')}\n\n` +
                  `*Valor Total:* R$ ${getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                  `*Desconto Pix/Dinheiro:* R$ ${parseFloat(pixDiscount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                  `*Valor no Pix:* R$ ${getPixTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                  `*Condições Cartão:* ${cardInfo || `R$ ${getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}\n\n` +
                  `O PDF oficial foi baixado em seu aparelho. Você pode anexar o arquivo na conversa! \n\nAtenciosamente,\nNORB PRO`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all font-sans"
              >
                Compartilhar no WhatsApp
              </a>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
