'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useImportProductsMutation } from '@/src/hooks/useProductsQuery';
import type { ImportProductsResult } from '@/src/api/productsApi';
import { useTranslation } from '@/src/context/I18nContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProductsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportProductsResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportProductsMutation();

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  const acceptFile = (f: File) => {
    const ok =
      f.name.endsWith('.csv') ||
      f.name.endsWith('.xlsx') ||
      f.name.endsWith('.xls');
    if (!ok) return;
    setFile(f);
    setResult(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    const res = await importMutation.mutateAsync(file);
    setResult(res);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('products.importTitle')}</DialogTitle>
          <DialogDescription>
            {t('products.importDescription')}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) acceptFile(f);
                }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {t('products.dragDropFile')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('products.maxSize')}
                  </p>
                </div>
              )}
            </div>

            {/* Column mapping hint */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs space-y-1">
                <p className="font-medium">{t('products.requiredColumns')}</p>
                <p>
                  <code className="bg-muted px-1 rounded">name</code>{' '}
                  <code className="bg-muted px-1 rounded">price</code>
                </p>
                <p className="font-medium mt-1">{t('products.optionalColumns')}</p>
                <p>
                  <code className="bg-muted px-1 rounded">currency</code>{' '}
                  <code className="bg-muted px-1 rounded">quantity</code>{' '}
                  <code className="bg-muted px-1 rounded">status</code>
                </p>
                <p className="text-muted-foreground mt-1">
                  {t('products.otherColumnsHint')}
                </p>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          // Result view
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {t('products.importedSuccess', { count: result.imported })}
                </p>
                {result.skipped > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('products.skippedRows', { count: result.skipped })}
                  </p>
                )}
              </div>
            </div>

            {result.createdFields.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('products.newSchemaFieldsCreated')}</p>
                <div className="flex flex-wrap gap-1">
                  {result.createdFields.map((f) => (
                    <Badge key={f} variant="secondary">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  {t('products.errorsCount', { count: result.errors.length })}
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-muted-foreground">
                  {result.errors.map((e) => (
                    <p key={e.row}>
                      <span className="font-mono text-destructive">
                        {t('products.rowError', { row: e.row })}
                      </span>{' '}
                      {e.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? t('common.close') : t('common.cancel')}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? t('products.importing') : t('products.import')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
