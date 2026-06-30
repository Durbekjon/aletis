"use client"

import { useState } from 'react'
import { DataPagination, SimplePagination } from '@/components/ui/data-pagination'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Example usage of DataPagination component
export function PaginationExample() {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 10
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Here you would typically fetch new data for the page
    console.log(`Navigating to page ${page}`)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Data Pagination Example</CardTitle>
          <CardDescription>
            Full pagination with page numbers and ellipsis. Only shows when hasNextPage is true.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p>Current Page: {currentPage}</p>
            <p>Total Pages: {totalPages}</p>
            <p>Has Next Page: {hasNextPage ? 'Yes' : 'No'}</p>
          </div>
          
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simple Pagination Example</CardTitle>
          <CardDescription>
            Basic next/previous navigation. Only shows when hasNextPage is true.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p>Current Page: {currentPage}</p>
            <p>Has Next Page: {hasNextPage ? 'Yes' : 'No'}</p>
          </div>
          
          <SimplePagination
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onNext={() => handlePageChange(currentPage + 1)}
            onPrevious={() => handlePageChange(currentPage - 1)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>No Pagination Example</CardTitle>
          <CardDescription>
            When hasNextPage is false, no pagination component is rendered.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p>Current Page: {currentPage}</p>
            <p>Total Pages: {totalPages}</p>
            <p>Has Next Page: {hasNextPage ? 'Yes' : 'No'}</p>
          </div>
          
          {/* This will not render anything when hasNextPage is false */}
          <DataPagination
            currentPage={totalPages} // Last page
            totalPages={totalPages}
            hasNextPage={false} // No next page
            hasPreviousPage={true}
            onPageChange={handlePageChange}
          />
          
          <p className="text-sm text-muted-foreground text-center">
            ↑ No pagination component rendered above because hasNextPage is false
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
