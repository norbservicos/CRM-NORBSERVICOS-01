import React, { useState, useRef } from 'react';
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

interface ServiceItem {
  id: string;
  description: string;
}

export default function Budget() {
  const [clientName, setClientName] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([{ id: '1', description: '' }]);
  const [totalPrice, setTotalPrice] = useState(''); // New global total price
  const [pixDiscount, setPixDiscount] = useState('0'); // Discount for Pix in %
  const [cardInfo, setCardInfo] = useState(''); // Custom card info
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const budgetRef = useRef<HTMLDivElement>(null);

  const addService = () => {
    setServices([...services, { id: Math.random().toString(36).substr(2, 9), description: '' }]);
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
    return total - (total * (discount / 100));
  };

  const exportToPdf = async () => {
    if (!budgetRef.current) return;
    setGeneratingPdf(true);
    
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
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Check for navigator.share support
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Orçamento - ' + (clientName || 'Cliente'),
            text: 'Olá! Segue o orçamento solicitado.',
          });
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            console.error('Erro ao compartilhar:', shareErr);
            pdf.save(fileName);
          }
        }
      } else {
        // Fallback to direct download
        pdf.save(fileName);
      }
    } catch (err) {
      console.error('Erro detalhado ao gerar PDF:', err);
      alert('Houve um erro ao gerar o PDF. Tente preencher novamente ou use outro navegador.');
    } finally {
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
                placeholder={getTotal() > 0 ? `R$ ${getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até 3x` : "Ex: R$250 de 5x"}
                value={cardInfo}
                onChange={(e) => setCardInfo(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-900/10 rounded-2xl font-bold transition-all"
              />
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                <Zap size={12} /> Desconto para Pix/Dinheiro (%)
              </label>
              <input
                type="number"
                step="1"
                placeholder="Ex: 5"
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
            className="bg-white p-12 space-y-10 w-full shadow-2xl rounded-3xl border border-slate-100 min-h-[800px] flex flex-col"
          >
            {/* PDF Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white rotate-3 shadow-lg">
                  <Sparkles size={32} />
                </div>
                <div>
                  <h3 className="font-black text-3xl text-slate-900 tracking-tighter">NORB PRO</h3>
                  <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block uppercase tracking-widest mt-1">Sua Marca Aqui</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data de Emissão</p>
                <p className="text-xl font-black text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-slate-900 p-8 rounded-3xl flex items-center justify-between text-white shadow-xl">
              <div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Orçamento para</span>
                <h4 className="text-2xl font-black mt-1">{clientName || 'Nome do Cliente'}</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Documento Nº</span>
                <p className="text-sm font-black">#BUD-{Math.floor(Math.random() * 10000)}</p>
              </div>
            </div>

            {/* Service List */}
            <div className="flex-1 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição dos Serviços</div>
              </div>

              <div className="space-y-4">
                {services.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-2 h-2 bg-blue-900 rounded-full mt-1.5 shrink-0" />
                    <p className="font-bold text-slate-800 leading-tight">{item.description || 'Descrição do item...'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Footer */}
            <div className="space-y-4 pt-10 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pix Choice */}
                <div className="p-6 bg-blue-900 rounded-3xl shadow-xl shadow-blue-900/20 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={64} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3 text-blue-200">
                      <Zap size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Pix ou Dinheiro</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight">
                      R$ {getPixTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] font-bold text-blue-300 mt-2 uppercase tracking-wide">Com {pixDiscount}% de desconto</p>
                  </div>
                </div>

                {/* Credit Card Choice */}
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="text-slate-400" size={16} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cartão de Crédito</span>
                  </div>
                  <p className={cn(
                    "font-black text-slate-900 tracking-tight",
                    (cardInfo || getTotal() > 0) ? (cardInfo.length > 15 ? "text-xl" : "text-3xl") : "text-3xl"
                  )}>
                    {cardInfo || `R$ ${getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
                    {cardInfo ? "Condição personalizada" : "Valor padrão sem descontos"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl mt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Informações Adicionais</p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  Este orçamento é válido por 7 dias a partir da data de emissão. 
                  Para pagamentos via Pix, utilize nossa chave cadastrada. 
                  Parcelamentos no cartão estão sujeitos a taxas da operadora.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 flex justify-between items-center opacity-30">
              <p className="text-[9px] font-black tracking-widest">PLATAFORMA NORB GESTÃO PRO</p>
              <p className="text-[9px] font-bold italic">Profissionalismo & Tecnologia</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
