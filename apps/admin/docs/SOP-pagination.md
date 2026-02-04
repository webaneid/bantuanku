# SOP: Pagination Component

## Overview
Standard Operating Procedure untuk penggunaan Pagination component di seluruh aplikasi admin Bantuanku untuk menampilkan data dalam halaman-halaman yang lebih kecil.

## 1. File Locations

```
src/
├── components/
│   └── Pagination.tsx             # Main component
└── styles/
    └── components/
        └── _pagination.scss       # Styling
```

## 2. Component Interface

### Props

```typescript
interface PaginationProps {
  currentPage: number;              // Current active page (1-based)
  totalPages: number;               // Total number of pages
  totalItems: number;               // Total number of items
  onPageChange: (page: number) => void; // Callback when page changes
}
```

## 3. Basic Implementation

### Step 1: Setup State

```tsx
import { useState } from "react";
import Pagination from "@/components/Pagination";

const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;  // Items per page
```

### Step 2: Calculate Pagination Values

```tsx
// Calculate total items and pages
const totalItems = data?.length || 0;
const totalPages = Math.ceil(totalItems / itemsPerPage);

// Calculate slice indices
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;

// Get paginated data
const paginatedData = data?.slice(startIndex, endIndex);
```

### Step 3: Render Component

```tsx
{/* Render your paginated data */}
{paginatedData?.map((item) => (
  <div key={item.id}>{item.name}</div>
))}

{/* Pagination component */}
{totalPages > 0 && (
  <Pagination
    currentPage={currentPage}
    totalPages={totalPages}
    totalItems={totalItems}
    onPageChange={setCurrentPage}
  />
)}
```

## 4. Complete Example: Table with Pagination

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Pagination from "@/components/Pagination";
import api from "@/lib/api";

export default function CampaignsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await api.get("/campaigns");
      return response.data.data;
    },
  });

  // Calculate pagination
  const totalItems = campaigns?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaigns = campaigns?.slice(startIndex, endIndex);

  return (
    <div>
      {/* Table */}
      <table className="table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Goal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {paginatedCampaigns?.map((campaign) => (
            <tr key={campaign.id}>
              <td>{campaign.title}</td>
              <td>Rp {formatRupiah(campaign.goal)}</td>
              <td>{campaign.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
```

## 5. Pagination with Filters

### Complete Implementation

```tsx
const [currentPage, setCurrentPage] = useState(1);
const [searchQuery, setSearchQuery] = useState("");
const [categoryFilter, setCategoryFilter] = useState("");
const [statusFilter, setStatusFilter] = useState("");
const itemsPerPage = 10;

// Step 1: Filter data first
const filteredData = campaigns?.filter((campaign) => {
  const matchesSearch = searchQuery === "" ||
    campaign.title.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesCategory = categoryFilter === "" || campaign.category === categoryFilter;
  const matchesStatus = statusFilter === "" || campaign.status === statusFilter;

  return matchesSearch && matchesCategory && matchesStatus;
});

// Step 2: Calculate pagination on filtered data
const totalItems = filteredData?.length || 0;
const totalPages = Math.ceil(totalItems / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
const paginatedData = filteredData?.slice(startIndex, endIndex);

// Step 3: Reset to page 1 when filters change
const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
  setter(value);
  setCurrentPage(1);  // Important: Reset pagination
};

// Usage
<input
  type="text"
  value={searchQuery}
  onChange={(e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);  // Reset to page 1
  }}
/>

<Autocomplete
  value={categoryFilter}
  onChange={handleFilterChange(setCategoryFilter)}
/>

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  onPageChange={setCurrentPage}
/>
```

## 6. Page Number Display Logic

### Smart Page Numbers

Pagination component automatically handles page number display:

- **Total pages ≤ 5**: Show all pages
  ```
  [1] [2] [3] [4] [5]
  ```

- **At beginning**: Show first 4 pages + last
  ```
  [1] [2] [3] [4] ... [20]
  ```

- **In middle**: Show first + range + last
  ```
  [1] ... [8] [9] [10] ... [20]
  ```

- **At end**: Show first + last 4 pages
  ```
  [1] ... [17] [18] [19] [20]
  ```

### Current Page Logic

```tsx
// Always show page 1
pages.push(1);

// Calculate visible range around current page
let start = Math.max(2, currentPage - 1);
let end = Math.min(totalPages - 1, currentPage + 1);

// Adjust if at beginning
if (currentPage <= 2) {
  end = 4;
}

// Adjust if at end
if (currentPage >= totalPages - 1) {
  start = totalPages - 3;
}

// Add ellipsis if needed
if (start > 2) pages.push("...");

// Add range
for (let i = start; i <= end; i++) {
  pages.push(i);
}

// Add ellipsis if needed
if (end < totalPages - 1) pages.push("...");

// Always show last page
pages.push(totalPages);
```

## 7. Styling Classes

### Component Structure

```
.pagination                     # Container
├── .pagination-info           # "Total transaksi: X"
└── .pagination-controls       # Navigation controls
    ├── .pagination-btn        # Previous/Next buttons
    │   ├── .pagination-prev  # Previous button
    │   └── .pagination-next  # Next button
    └── .pagination-numbers    # Page numbers container
        └── .pagination-number # Single page number
            ├── .active       # Active page
            └── .ellipsis     # "..." separator
```

### State Classes

```scss
.pagination-btn:disabled        // Disabled prev/next
.pagination-number.active       // Active page (blue background)
.pagination-number.ellipsis     // Ellipsis (non-clickable)
```

## 8. Features

### Navigation
- **Previous Button**: Go to previous page (disabled on page 1)
- **Next Button**: Go to next page (disabled on last page)
- **Page Numbers**: Click to jump to specific page
- **Ellipsis**: Visual separator (non-clickable)

### Visual Feedback
- Active page: Blue background (`$primary-500`)
- Hover states on all clickable elements
- Disabled states for edge cases
- Consistent spacing and sizing

### Responsive Design
- Desktop: Horizontal layout
- Mobile: Stacked layout with centered controls
- Smaller buttons and text on mobile

### Accessibility
- Proper button semantics
- `aria-label` for prev/next buttons
- Disabled states properly handled
- Keyboard accessible

## 9. Common Use Cases

### Case 1: Simple List Pagination

```tsx
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 20;

const totalItems = users?.length || 0;
const totalPages = Math.ceil(totalItems / itemsPerPage);
const paginatedUsers = users?.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

<ul>
  {paginatedUsers?.map(user => (
    <li key={user.id}>{user.name}</li>
  ))}
</ul>

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  onPageChange={setCurrentPage}
/>
```

### Case 2: Table with Server-Side Pagination

```tsx
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

// Fetch data with pagination params
const { data } = useQuery({
  queryKey: ["campaigns", currentPage],
  queryFn: async () => {
    const response = await api.get("/campaigns", {
      params: {
        page: currentPage,
        limit: itemsPerPage,
      },
    });
    return response.data;
  },
});

const totalItems = data?.meta?.total || 0;
const totalPages = Math.ceil(totalItems / itemsPerPage);

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  onPageChange={setCurrentPage}
/>
```

### Case 3: Cards Grid with Pagination

```tsx
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 12;

const totalItems = products?.length || 0;
const totalPages = Math.ceil(totalItems / itemsPerPage);
const paginatedProducts = products?.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

<div className="grid grid-cols-3 gap-4">
  {paginatedProducts?.map(product => (
    <div key={product.id} className="card">
      {product.name}
    </div>
  ))}
</div>

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  onPageChange={setCurrentPage}
/>
```

## 10. Integration Patterns

### With Search + Sort + Filter

```tsx
const [currentPage, setCurrentPage] = useState(1);
const [searchQuery, setSearchQuery] = useState("");
const [sortBy, setSortBy] = useState("createdAt");
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
const [statusFilter, setStatusFilter] = useState("");

// Filter
const filteredData = data?.filter(item => {
  const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesStatus = statusFilter === "" || item.status === statusFilter;
  return matchesSearch && matchesStatus;
});

// Sort
const sortedData = [...(filteredData || [])].sort((a, b) => {
  const aVal = a[sortBy];
  const bVal = b[sortBy];
  const comparison = aVal > bVal ? 1 : -1;
  return sortOrder === "asc" ? comparison : -comparison;
});

// Paginate
const totalItems = sortedData.length;
const totalPages = Math.ceil(totalItems / itemsPerPage);
const paginatedData = sortedData.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

// Reset page on filter/sort change
useEffect(() => {
  setCurrentPage(1);
}, [searchQuery, statusFilter, sortBy, sortOrder]);
```

### With URL Query Params

```tsx
import { useSearchParams } from "next/navigation";

const searchParams = useSearchParams();
const [currentPage, setCurrentPage] = useState(
  Number(searchParams.get("page")) || 1
);

const handlePageChange = (page: number) => {
  setCurrentPage(page);

  // Update URL
  const params = new URLSearchParams(searchParams);
  params.set("page", page.toString());
  window.history.pushState({}, "", `?${params.toString()}`);
};

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  onPageChange={handlePageChange}
/>
```

## 11. Best Practices

### ✅ DO

```tsx
// Use consistent items per page across similar views
const itemsPerPage = 10;  // Standard for tables
const itemsPerPage = 20;  // For lists
const itemsPerPage = 12;  // For grids (3 cols × 4 rows)

// Reset to page 1 when filters change
const handleFilterChange = (value: string) => {
  setFilter(value);
  setCurrentPage(1);
};

// Hide pagination when not needed
{totalPages > 0 && <Pagination />}

// Use meaningful total items label
"Total transaksi: 34"
"Total campaigns: 156"

// Show pagination after content
<div>
  {content}
  <Pagination />
</div>
```

### ❌ DON'T

```tsx
// Don't show pagination for single page
{totalPages === 1 && <Pagination />}  // ❌

// Don't forget to reset page on filter change
const handleFilterChange = (value: string) => {
  setFilter(value);
  // Missing: setCurrentPage(1);
};

// Don't use inconsistent items per page
const itemsPerPage = Math.random() * 20;  // ❌

// Don't calculate wrong indices
const startIndex = currentPage * itemsPerPage;  // ❌ Should be (currentPage - 1)

// Don't forget null checks
const paginatedData = data.slice(startIndex, endIndex);  // ❌ data might be undefined
```

## 12. Performance Optimization

### Memoize Calculations

```tsx
import { useMemo } from "react";

const paginatedData = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return filteredData?.slice(startIndex, endIndex);
}, [filteredData, currentPage, itemsPerPage]);
```

### Virtualization for Large Lists

```tsx
// For very large datasets (1000+ items), consider using virtualization
import { useVirtualizer } from "@tanstack/react-virtual";

// Then paginate the virtualized results
```

## 13. Customization

### Different Items Per Page

```tsx
const [itemsPerPage, setItemsPerPage] = useState(10);

<select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
  <option value="10">10 per page</option>
  <option value="20">20 per page</option>
  <option value="50">50 per page</option>
</select>

<Pagination
  currentPage={currentPage}
  totalPages={Math.ceil(totalItems / itemsPerPage)}
  totalItems={totalItems}
  onPageChange={setCurrentPage}
/>
```

### Custom Total Items Label

Modify component to accept custom label:

```tsx
// In Pagination component
<div className="pagination-info">
  {customLabel || `Total transaksi: ${totalItems}`}
</div>
```

## 14. Troubleshooting

### Issue: Page numbers not updating

**Solution**: Check if `currentPage` state is properly set
```tsx
<Pagination
  currentPage={currentPage}  // Make sure this updates
  onPageChange={setCurrentPage}  // Make sure this is called
/>
```

### Issue: Data not slicing correctly

**Solution**: Verify slice indices calculation
```tsx
const startIndex = (currentPage - 1) * itemsPerPage;  // Correct
const endIndex = startIndex + itemsPerPage;
```

### Issue: Pagination shows when no data

**Solution**: Add conditional rendering
```tsx
{totalPages > 0 && <Pagination />}
```

### Issue: Filter changes don't reset page

**Solution**: Reset currentPage to 1
```tsx
const handleFilterChange = (value: string) => {
  setFilter(value);
  setCurrentPage(1);  // Add this
};
```

---

**Version**: 1.0
**Last Updated**: 2025-01-18
**Maintained by**: Development Team
