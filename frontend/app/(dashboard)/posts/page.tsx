'use client';

import { LanguageSwitcher } from '@/components/language-switcher';
import { ChannelFilterDropdown } from '@/components/posts/ChannelFilterDropdown';
import { PostsPagination } from '@/components/posts/PostsPagination';
import { PostStatusBadge } from '@/components/posts/PostStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type PostStatus } from '@/lib/types/post';
import { useTranslation } from '@/src/context/I18nContext';
import { useDeletePostMutation, usePostsQuery } from '@/src/hooks/usePostsQuery';
import { Edit, Eye, MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { RefreshButton } from '../../../components/ui/refresh-button';

export default function PostsPage() {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Build query parameters
  const queryParams = {
    page: currentPage,
    limit: 10,
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter as PostStatus) : undefined,
    channelId: channelFilter !== 'all' ? parseInt(channelFilter) : undefined,
  };

  const { data: postsData, isLoading, error, refetch, isFetching } = usePostsQuery(queryParams);
  const deletePostMutation = useDeletePostMutation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'en' ? 'en-US' : 'uz-UZ';

  const handleDeletePost = async (postId: string) => {
    if (confirm(t('posts.deleteConfirm'))) {
      await deletePostMutation.mutateAsync(parseInt(postId));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPrice = (product: { price: number; currency: string }) => {
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('posts.title')}</h1>
            <p className="text-muted-foreground">{t('posts.subtitle')}</p>
          </div>
        </div>
        <Card className="lp-glass-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">{t('posts.errorMessage')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getProductImage = (image?: string) => {
    if (image) {
      return /^https?:\/\//i.test(image)
        ? image
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/${image}`;
    }
    return '/placeholder.svg?height=32&width=32';
  };

  const handleRefresh = async () => {
    const result = await refetch();
    if (result.data) {
      setCurrentPage(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('posts.title')}</h1>
          <p className="text-muted-foreground">{t('posts.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />

          <RefreshButton
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isLoading || isFetching}
            disabled={isLoading || isFetching}
          >
            {t('common.refresh')}
          </RefreshButton>
          <Button asChild className="lp-glow-btn">
            <Link href="/posts/create">
              <Plus className="h-4 w-4 mr-2" />
              {t('posts.createPost')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="lp-glass-card">
        <CardHeader>
          <CardTitle>{t('posts.filtersTitle')}</CardTitle>
          <CardDescription>{t('posts.filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('posts.searchPosts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('posts.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('posts.statusAll')}</SelectItem>
                <SelectItem value="SENT">{t('posts.statusSent')}</SelectItem>
                <SelectItem value="SCHEDULED">{t('posts.statusScheduled')}</SelectItem>
                <SelectItem value="DRAFT">{t('posts.statusDraft')}</SelectItem>
                <SelectItem value="FAILED">{t('posts.statusFailed')}</SelectItem>
              </SelectContent>
            </Select>
            <ChannelFilterDropdown
              value={channelFilter}
              onValueChange={setChannelFilter}
              placeholder={t('posts.channelPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card className="lp-glass-card">
        <CardHeader>
          <CardTitle>{t('posts.tableTitle', { count: postsData?.total || 0 })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('posts.loading')}</p>
            </div>
          ) : postsData?.items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('posts.emptyDescription')}</p>
              <Button asChild className="mt-4">
                <Link href="/posts/create">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('posts.emptyCta')}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('posts.columnContent')}</TableHead>
                    <TableHead>{t('posts.columnChannel')}</TableHead>
                    <TableHead>{t('posts.columnStatus')}</TableHead>
                    <TableHead>{t('posts.columnDate')}</TableHead>
                    <TableHead>{t('posts.columnProduct')}</TableHead>
                    <TableHead className="text-right">{t('posts.columnActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postsData?.items.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <Link href={`/posts/${post.id}`}>
                          <div className="flex items-center gap-3">
                            {post.product?.images && post.product.images.length > 0 ? (
                              <img
                                src={getProductImage(post.product.images[0].url || undefined)}
                                alt={post.product?.name || 'Product'}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <img
                                src="/placeholder.svg?height=32&width=32"
                                alt={post.product?.name || 'Product'}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            )}
                            <div>
                              <div className="text-sm text-muted-foreground">
                                {post.content.length > 50
                                  ? `${post.content.substring(0, 50)}...`
                                  : post.content}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {post.channel ? (
                          <Link href={`https://t.me/${post.channel.username}`}>
                            <Badge className="">{post.channel.title}</Badge>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{t('common.notFound')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/posts/${post.id}`}>
                          <PostStatusBadge status={post.status} />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/posts/${post.id}`}>
                          <div className="text-sm">
                            {post.status === 'SENT' && post.sentAt && formatDate(post.sentAt)}
                            {post.status === 'SCHEDULED' &&
                              post.scheduledAt &&
                              formatDate(post.scheduledAt)}
                            {post.status === 'DRAFT' && formatDate(post.createdAt)}
                            {post.status === 'FAILED' && formatDate(post.createdAt)}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {post.product ? (
                          <Link href={`/products/${post.product.id}`}>
                            <div className="text-sm">
                              <div className="font-medium">{post.product.name}</div>
                              <div>{getPrice(post.product)}</div>
                            </div>
                          </Link>
                        ) : (
                          <span>-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('posts.actionsLabel')}</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/posts/${post.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t('posts.actionView')}
                              </Link>
                            </DropdownMenuItem>
                            {post.status !== 'SENT' && (
                              <DropdownMenuItem asChild>
                                <Link href={`/posts/${post.id}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t('posts.actionEdit')}
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('posts.actionDelete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {postsData && postsData.totalPages > 1 && (
                <div className="mt-4">
                  <PostsPagination
                    currentPage={postsData.page}
                    totalPages={postsData.totalPages}
                    hasNext={postsData.hasNext}
                    hasPrevious={postsData.hasPrevious}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
