'use client';

import { LanguageSwitcher } from '@/components/language-switcher';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataPagination } from '@/components/ui/data-pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Product } from '@/lib/types/product';
import { useTranslation } from '@/src/context/I18nContext';
import { useDebounce } from '@/src/hooks/useDebounce';
import {
  useBulkDeleteProductsMutation,
  useDeleteProductMutation,
  useProductsQuery,
} from '@/src/hooks/useProductsQuery';
import { ImportProductsDialog } from '@/components/product/import-products-dialog';
import {
  AlertCircle,
  AlertTriangle,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RefreshButton } from '../../../components/ui/refresh-button';

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  const debouncedSearch = useDebounce(searchQuery, 400);

  // API hooks
  const productsQuery = useProductsQuery({
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined,
    page,
  });
  const deleteProductMutation = useDeleteProductMutation();
  const bulkDeleteMutation = useBulkDeleteProductsMutation();

  const products = productsQuery.data?.items || [];
  const isLoading = productsQuery.isLoading || productsQuery.isFetching;
  const error = productsQuery.error;

  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'single' | 'bulk'>('single');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const allIdsOnPage = useMemo(() => products.map((p) => p.id), [products]);
  const isAllSelected = selectedIds.length > 0 && selectedIds.length === allIdsOnPage.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < allIdsOnPage.length;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(allIdsOnPage);
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    );
  };

  const confirmSingleDelete = (productId: string) => {
    setConfirmMode('single');
    setPendingDeleteId(productId);
    setConfirmOpen(true);
  };

  const confirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmMode('bulk');
    setPendingDeleteId(null);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (confirmMode === 'single' && pendingDeleteId) {
        await deleteProductMutation.mutateAsync(parseInt(pendingDeleteId));
        setSelectedIds((prev) => prev.filter((id) => id !== pendingDeleteId));
      } else if (confirmMode === 'bulk') {
        await bulkDeleteMutation.mutateAsync(selectedIds.map((id) => parseInt(id)));
        setSelectedIds([]);
      }
    } finally {
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleRefresh = () => {
    productsQuery.refetch().catch((error) => {
      console.error('Error refreshing products:', error);
    });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    // Optionally scroll to top on page change
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusBadge = (status: Product['status']) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return (
          <Badge variant="outline" className="text-primary-500 border-primary-500 bg-none">
            {t('products.statusActive')}
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-500">
            {t('products.statusDraft')}
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-500">
            {t('products.statusArchived')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPrice = (product: Product) => {
    const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'en' ? 'en-US' : 'uz-UZ';
    let price = product.price.toLocaleString(locale);
    if (!product?.currency) return price;
    switch (product?.currency) {
      case 'USD':
        price = `$${price}`;
        break;
      case 'EUR':
        price = `€${price}`;
        break;
      default:
        price = `${price} ${product.currency?.toLowerCase()}`;
        break;
    }
    return price;
  };

  const getStockStatus = (product: Product) => {
    if (!product.trackQuantity) return null;
    if (product.quantity <= 0) {
      return <Badge variant="destructive">{t('products.stockOut')}</Badge>;
    }
    if (product.quantity <= product.lowStockThreshold) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          {t('products.stockLow')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-primary border-primary">
        {t('products.stockIn')}
      </Badge>
    );
  };

  const getImageUrl = (image?: string) => {
    if (image) {
      return /^https?:\/\//i.test(image)
        ? image
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/${image}`;
    }
    return '/placeholder.svg?height=40&width=40';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
          <p className="text-muted-foreground">{t('products.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <RefreshButton
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {t('common.refresh')}
          </RefreshButton>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('products.import')}
          </Button>
          <Button asChild className="lp-glow-btn">
            <Link href="/products/new">
              <Plus className="h-4 w-4 mr-2" />
              {t('products.addProduct')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || t('products.error')}
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="active:scale-95 transition-transform"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('common.retry')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="lp-glass-card">
        <CardHeader>
          <CardTitle>{t('products.filtersTitle')}</CardTitle>
          <CardDescription>{t('products.filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('products.searchProducts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('products.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('products.statusAll')}</SelectItem>
                <SelectItem value="active">{t('products.statusActive')}</SelectItem>
                <SelectItem value="draft">{t('products.statusDraft')}</SelectItem>
                <SelectItem value="archived">{t('products.statusArchived')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="lp-glass-card">
        <CardHeader>
          <CardTitle>
            {t('products.tableTitle', { count: productsQuery.data?.total ?? products.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                <Plus className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">{t('products.noProducts')}</p>
                <p className="text-sm">{t('products.emptyDescription')}</p>
              </div>
              <Button asChild>
                <Link href="/products/new">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('products.emptyCta')}
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">
                    <Checkbox
                      checked={
                        isAllSelected ? true : isIndeterminate ? ('indeterminate' as any) : false
                      }
                      onCheckedChange={(c) => toggleSelectAll(c !== false)}
                      aria-label={t('products.selectAll')}
                    />
                  </TableHead>
                  <TableHead>{t('products.columnProduct')}</TableHead>
                  <TableHead>{t('products.columnStatus')}</TableHead>
                  <TableHead>{t('products.columnStock')}</TableHead>
                  <TableHead>{t('products.columnPrice')}</TableHead>
                  <TableHead className="text-right">{t('products.columnActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(product.id)}
                          onCheckedChange={(c) => toggleSelect(product.id, Boolean(c))}
                          aria-label={t('products.selectProduct', { name: product.name })}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/products/${product.id}`}
                        className="group flex items-center gap-3"
                      >
                        <img
                          src={getImageUrl(product.images[0])}
                          alt={product.name}
                          className="h-10 w-10 rounded-md object-cover group-hover:opacity-90 transition"
                        />
                        <div>
                          <div className="font-medium group-hover:underline">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.description.length > 50
                              ? `${product.description.substring(0, 50)}...`
                              : product.description}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(product.status)}
                        {product.quantity <= product.lowStockThreshold && product.trackQuantity && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {t('products.stockUnits', { count: product.quantity })}
                        </span>
                        {getStockStatus(product)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getPrice(product)}</span>
                        {product.compareAtPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            {product.currency} {product.compareAtPrice}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="bottom"
                          align="end"
                          sideOffset={6}
                          avoidCollisions={false}
                          collisionPadding={8}
                          portalled={false}
                          className="min-w-[160px] z-[60]"
                        >
                          <DropdownMenuLabel>{t('products.actionsLabel')}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/products/${product.id}`} className="flex items-center">
                              <Eye className="mr-2 h-4 w-4" />
                              {t('products.actionView')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/products/${product.id}/edit`}
                              className="flex items-center"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              {t('products.actionEdit')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => confirmSingleDelete(product.id)}
                            disabled={deleteProductMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('products.actionDelete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {/* Pagination: render only if next page exists */}
          {productsQuery.data && (
            <div className="mt-6">
              <DataPagination
                currentPage={productsQuery.data.page}
                totalPages={productsQuery.data.totalPages}
                hasNextPage={productsQuery.data.hasNext}
                hasPreviousPage={productsQuery.data.hasPrevious}
                onPageChange={handlePageChange}
              />
            </div>
          )}
          {selectedIds.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="destructive"
                disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
                onClick={confirmBulkDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />{' '}
                {t('products.bulkDelete', { count: selectedIds.length })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <ImportProductsDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmMode === 'single'
                ? t('products.deleteSingleTitle')
                : t('products.deleteBulkTitle')}
            </DialogTitle>
            <DialogDescription>
              {confirmMode === 'single'
                ? t('products.deleteSingleDescription')
                : t('products.deleteBulkDescription', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteProductMutation.isPending || bulkDeleteMutation.isPending}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
