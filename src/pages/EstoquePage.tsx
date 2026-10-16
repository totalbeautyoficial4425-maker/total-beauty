import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Download, 
  ShoppingCart, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpDown, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Minus, 
  Layers, 
  Sparkles, 
  Check, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { InventoryItem, InventoryCategory } from '../types';
import { formatBRL, downloadCSV, formatDateBR } from '../utils/formatters';
import { InventoryModal } from '../components/modals/InventoryModal';
import { StockAdjustModal } from '../components/modals/StockAdjustModal';
import { ShoppingListModal } from '../components/modals/ShoppingListModal';

export const EstoquePage: React.FC = () => {
  const { 
    inventory, 
    lowStockCount, 
    outOfStockCount, 
    totalInventoryValue,
    adjustStock,
    deleteInventoryItem
  } = useData();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'baixo' | 'esgotado' | 'ok'>('todos');
  const [brandFilter, setBrandFilter] = useState<string>('todas');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');

  // Modals state
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);

  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  // Available brands in inventory
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(i => set.add(i.brand));
    return Array.from(set).sort();
  }, [inventory]);

  // Available categories in inventory
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(i => set.add(i.category));
    return Array.from(set).sort();
  }, [inventory]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Status filter
      if (statusFilter === 'baixo' && (item.currentStock > item.minStock || item.currentStock === 0)) return false;
      if (statusFilter === 'esgotado' && item.currentStock > 0) return false;
      if (statusFilter === 'ok' && item.currentStock <= item.minStock) return false;

      // Brand filter
      if (brandFilter !== 'todas' && item.brand.toLowerCase() !== brandFilter.toLowerCase()) return false;

      // Category filter
      if (categoryFilter !== 'todas' && item.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.supplier && item.supplier.toLowerCase().includes(q)) ||
          (item.location && item.location.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [inventory, statusFilter, brandFilter, categoryFilter, searchQuery]);

  // Handlers
  const handleOpenAdd = () => {
    setItemToEdit(null);
    setIsInventoryModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsInventoryModalOpen(true);
  };

  const handleOpenAdjust = (item: InventoryItem) => {
    setItemToAdjust(item);
    setIsAdjustModalOpen(true);
  };

  const handleQuickAdd = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    adjustStock(item.id, 1, 'Entrada rápida de 1 unidade', 'entrada');
  };

  const handleQuickSubtract = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.currentStock <= 0) return;
    adjustStock(item.id, 1, 'Consumo de 1 unidade no atendimento', 'saida');
  };

  const handleDelete = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o produto "${item.name}" do controle de estoque?`)) {
      deleteInventoryItem(item.id);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nome do Material',
      'Marca',
      'Categoria',
      'Estoque Atual',
      'Estoque Mínimo Alerta',
      'Unidade',
      'Status Estoque',
      'Preço Custo Unitário (R$)',
      'Valor Total em Estoque (R$)',
      'Local Armazenamento',
      'Fornecedor / Representante',
      'Última Reposição',
      'Observações'
    ];

    const rows = filteredInventory.map(item => {
      let statusLabel = 'Normal';
      if (item.currentStock === 0) statusLabel = 'Esgotado';
      else if (item.currentStock <= item.minStock) statusLabel = 'Abaixo do Mínimo';

      return [
        item.id,
        item.name,
        item.brand,
        item.category,
        item.currentStock,
        item.minStock,
        item.unit,
        statusLabel,
        (item.costPrice || 0).toFixed(2),
        ((item.costPrice || 0) * item.currentStock).toFixed(2),
        item.location || '',
        item.supplier || '',
        item.lastRestockedAt ? formatDateBR(item.lastRestockedAt) : '',
        item.notes || ''
      ];
    });

    downloadCSV(`estoque_total_beauty_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const regularStockCount = inventory.length - (lowStockCount + outOfStockCount);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header Card */}
      <div className="bg-tb-white rounded-3xl p-6 sm:p-8 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary">
              Acesso Exclusivo da Gestão
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-tb-rose-blush text-tb-rose-primary border border-tb-rose-light">
              Admin
            </span>
          </div>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Controle de Estoque do Salão
          </h2>
          <p className="text-xs sm:text-sm text-tb-brown-soft mt-1 max-w-xl">
            Acompanhe o consumo diário de tintas, descolorantes, oxigenadas, progressivas e saiba quando comprar novamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setIsShoppingListOpen(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-soft flex items-center justify-center gap-2 transition-all"
          >
            <ShoppingCart className="w-4 h-4 text-amber-700" />
            <span>Lista de Compras</span>
            {(lowStockCount + outOfStockCount) > 0 && (
              <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {lowStockCount + outOfStockCount}
              </span>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-2xl border border-tb-rose-light bg-tb-ivory hover:bg-tb-beige-light text-xs font-semibold text-tb-brown-dark flex items-center justify-center gap-2 transition-colors"
            title="Exportar dados do estoque para planilha Excel / CSV"
          >
            <Download className="w-4 h-4 text-tb-rose-primary" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-premium flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Novo Material
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Cadastrado */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Itens Cadastrados</span>
            <div className="w-8 h-8 rounded-lg bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {inventory.length}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            {availableBrands.length} marcas ativas
          </p>
        </div>

        {/* Card 2: Repor Urgente / Baixo Estoque */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-soft transition-all ${
          lowStockCount > 0 
            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200' 
            : 'bg-tb-white border-tb-rose-light/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-800">Baixo Estoque</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-800">
            {lowStockCount}
          </div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">
            {lowStockCount === 1 ? 'Necessita de compra' : 'Necessitam de compra'}
          </p>
        </div>

        {/* Card 3: Esgotados / Zerados */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-soft transition-all ${
          outOfStockCount > 0 
            ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200' 
            : 'bg-tb-white border-tb-rose-light/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-rose-800">Esgotados (Zerados)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              0
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-800">
            {outOfStockCount}
          </div>
          <p className="text-[11px] text-rose-700 mt-1 font-medium">
            {outOfStockCount > 0 ? 'Sem estoque no salão!' : 'Nenhum item zerado'}
          </p>
        </div>

        {/* Card 4: Estoque Normal */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Estoque Regular</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {regularStockCount}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">
            Nível seguro para atendimentos
          </p>
        </div>

        {/* Card 5: Valor Total em Estoque */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Valor Estimado</span>
            <div className="w-8 h-8 rounded-lg bg-tb-beige-light text-tb-brown-dark flex items-center justify-center font-bold text-xs">
              R$
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-rose-primary">
            {formatBRL(totalInventoryValue)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Capital em produtos
          </p>
        </div>
      </div>

      {/* Alerta de Estoque Crítico (Banner Superior) */}
      {(lowStockCount + outOfStockCount) > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-rose-50/70 to-amber-50/50 border-2 border-amber-200/90 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                  Atenção: {lowStockCount + outOfStockCount} materiais estão acabando no salão!
                </h4>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Comprar Novamente
                </span>
              </div>
              <p className="text-xs text-tb-brown-soft mt-0.5">
                Gere a lista automática com as quantidades sugeridas e envie direto pelo WhatsApp dos representantes da Lowell, Wella ou Erick Kenedy.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsShoppingListOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5 shrink-0 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Ver Lista de Compras
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-tb-white rounded-3xl p-5 border border-tb-rose-light/40 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-tb-gray-neutral absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Pesquisar por nome do produto, marca (Wella, Lowell, Erick Kenedy), categoria..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
            />
          </div>

          {/* Marca Selector */}
          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-tb-brown-soft whitespace-nowrap">Marca:</span>
            <select
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
              className="w-full md:w-44 text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
            >
              <option value="todas">Todas as Marcas</option>
              {availableBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Categoria Selector */}
          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-tb-brown-soft whitespace-nowrap">Categoria:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full md:w-52 text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
            >
              <option value="todas">Todas as Categorias</option>
              {availableCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-tb-rose-light/30">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'todos', label: `Todos (${inventory.length})` },
              { id: 'baixo', label: `⚠️ Baixo Estoque (${lowStockCount})` },
              { id: 'esgotado', label: `❌ Esgotados (${outOfStockCount})` },
              { id: 'ok', label: `✅ Nível Adequado (${regularStockCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-tb-rose-primary text-white shadow-sm font-semibold'
                    : 'bg-tb-ivory text-tb-brown-soft hover:bg-tb-beige-light'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-tb-gray-neutral">
            Exibindo <strong>{filteredInventory.length}</strong> de {inventory.length} produtos
          </span>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tb-ivory border-b border-tb-rose-light/40 text-tb-brown-soft font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Material / Produto</th>
                <th className="px-6 py-4">Marca & Categoria</th>
                <th className="px-6 py-4 text-center">Nível de Estoque</th>
                <th className="px-6 py-4 text-center">Mínimo Alerta</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Custo Un.</th>
                <th className="px-6 py-4 text-right">Ajuste Rápido & Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-tb-gray-neutral">
                    <div className="w-16 h-16 rounded-3xl bg-tb-rose-blush/60 text-tb-rose-primary flex items-center justify-center mx-auto mb-3 border border-tb-rose-light">
                      <Package className="w-8 h-8 stroke-[1.8]" />
                    </div>
                    <p className="font-serif-brand text-lg font-bold text-tb-brown-dark">Estoque Limpo e Pronto para Novos Materiais</p>
                    <p className="text-xs text-tb-brown-soft max-w-md mx-auto mt-1 leading-relaxed">
                      Os produtos de exemplo foram removidos conforme solicitado. Você pode cadastrar os materiais reais através do botão <strong>"+ Novo Material"</strong> ou aguardar o envio da lista para preenchimento.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-bold shadow-soft hover:shadow-premium transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      Cadastrar Primeiro Material
                    </button>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-tb-gray-neutral">
                    <Package className="w-8 h-8 text-tb-gray-neutral/50 mx-auto mb-2" />
                    <p className="font-semibold text-tb-brown-dark">Nenhum produto encontrado com os filtros atuais.</p>
                    <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                      Verifique os filtros selecionados ou clique em "+ Novo Material" para cadastrar.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const isOutOfStock = item.currentStock === 0;
                  const isLowStock = item.currentStock <= item.minStock && !isOutOfStock;
                  const stockPercent = item.minStock > 0 
                    ? Math.min(100, Math.round((item.currentStock / (item.minStock * 2)) * 100))
                    : 100;

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-tb-ivory/50 transition-colors group"
                    >
                      {/* Name & Location */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-tb-brown-dark group-hover:text-tb-rose-primary transition-colors text-sm">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-tb-gray-neutral">
                            {item.location && (
                              <span>📍 {item.location}</span>
                            )}
                            {item.supplier && (
                              <span>• Fornecedor: {item.supplier}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Brand & Category */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tb-rose-blush text-tb-rose-primary border border-tb-rose-light/80">
                            {item.brand}
                          </span>
                          <p className="text-[11px] text-tb-gray-neutral">
                            {item.category}
                          </p>
                        </div>
                      </td>

                      {/* Current Stock with Visual Bar */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-base font-extrabold ${
                            isOutOfStock ? 'text-rose-600' :
                            isLowStock ? 'text-amber-700' :
                            'text-emerald-700'
                          }`}>
                            {item.currentStock} {item.unit}(s)
                          </span>
                          {/* Mini Progress Bar */}
                          <div className="w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isOutOfStock ? 'bg-rose-500 w-0' :
                                isLowStock ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Min Stock Alert */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-xs font-semibold text-tb-brown-soft bg-tb-ivory px-2.5 py-1 rounded-lg border border-tb-rose-light/40">
                          {item.minStock} {item.unit}(s)
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 w-max animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Esgotado!
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Comprar Novamente
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Estoque Adequado
                          </span>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className="font-semibold text-tb-brown-dark">
                            {item.costPrice ? formatBRL(item.costPrice) : '—'}
                          </span>
                          {item.costPrice ? (
                            <span className="text-[10px] text-tb-gray-neutral block mt-0.5">
                              Total: {formatBRL(item.costPrice * item.currentStock)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Quick Adjust Buttons & Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick [-] Consumption */}
                          <button
                            onClick={(e) => handleQuickSubtract(item, e)}
                            disabled={item.currentStock <= 0}
                            className="p-1.5 bg-tb-ivory hover:bg-rose-100 text-rose-700 rounded-lg border border-tb-rose-light transition-colors disabled:opacity-30"
                            title="Dar baixa de 1 unidade utilizada"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick [+] Add */}
                          <button
                            onClick={(e) => handleQuickAdd(item, e)}
                            className="p-1.5 bg-tb-ivory hover:bg-emerald-100 text-emerald-700 rounded-lg border border-tb-rose-light transition-colors"
                            title="Dar entrada de 1 unidade recebida"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Adjust Dialog Button */}
                          <button
                            onClick={() => handleOpenAdjust(item)}
                            className="p-1.5 text-tb-brown-soft hover:bg-tb-beige-light rounded-lg transition-colors border border-transparent hover:border-tb-rose-light/50"
                            title="Balanço / Movimentação detalhada"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Product */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-tb-brown-soft hover:bg-tb-beige-light rounded-lg transition-colors border border-transparent hover:border-tb-rose-light/50"
                            title="Editar cadastro do produto"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Product */}
                          <button
                            onClick={(e) => handleDelete(item, e)}
                            className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover do estoque"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Add / Edit Product Modal */}
      <InventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        itemToEdit={itemToEdit}
      />

      {/* 2. Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        item={itemToAdjust}
      />

      {/* 3. Shopping List Modal */}
      <ShoppingListModal
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
      />
    </div>
  );
};
