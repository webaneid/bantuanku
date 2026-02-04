# SOP: Autocomplete Component

## Overview
Standard Operating Procedure untuk penggunaan Autocomplete component sebagai pengganti native `<select>` dropdown di seluruh aplikasi admin Bantuanku.

## 1. File Locations

```
src/
├── components/
│   └── Autocomplete.tsx          # Main component
└── styles/
    └── components/
        └── _autocomplete.scss    # Styling
```

## 2. Component Interface

### Props

```typescript
interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];    // Array of options
  value: string;                    // Current selected value
  onChange: (value: string) => void; // Callback when value changes
  placeholder?: string;             // Placeholder text (default: "Select...")
  className?: string;               // Additional CSS class
  disabled?: boolean;               // Disabled state (default: false)
  allowClear?: boolean;            // Show clear button (default: true)
}
```

## 3. Basic Usage

### Simple Autocomplete

```tsx
import Autocomplete from "@/components/Autocomplete";

const [category, setCategory] = useState("");

const categoryOptions = [
  { value: "pendidikan", label: "Pendidikan" },
  { value: "kesehatan", label: "Kesehatan" },
  { value: "bencana", label: "Bencana Alam" },
];

<Autocomplete
  options={categoryOptions}
  value={category}
  onChange={setCategory}
  placeholder="Pilih Kategori"
/>
```

### With Filter (Include "All" Option)

```tsx
const categoryOptions = [
  { value: "", label: "All Categories" },  // Empty value for "all"
  { value: "pendidikan", label: "Pendidikan" },
  { value: "kesehatan", label: "Kesehatan" },
];

<Autocomplete
  options={categoryOptions}
  value={categoryFilter}
  onChange={setCategoryFilter}
  placeholder="All Categories"
/>
```

### Required Field (No Clear Button)

```tsx
<Autocomplete
  options={categoryOptions}
  value={category}
  onChange={setCategory}
  placeholder="Pilih Kategori"
  allowClear={false}  // Hide X button
/>
```

### Disabled State

```tsx
<Autocomplete
  options={categoryOptions}
  value={category}
  onChange={setCategory}
  placeholder="Pilih Kategori"
  disabled={true}
/>
```

## 4. Integration with React Hook Form

### Method 1: Using Hidden Input + setValue

```tsx
import { useForm } from "react-hook-form";
import Autocomplete from "@/components/Autocomplete";

const { register, handleSubmit, setValue } = useForm();
const [category, setCategory] = useState("");

const handleCategoryChange = (value: string) => {
  setCategory(value);
  setValue("category", value);  // Update form value
};

<div>
  <label className="form-label">
    Kategori <span className="text-danger-500">*</span>
  </label>
  <Autocomplete
    options={categoryOptions}
    value={category}
    onChange={handleCategoryChange}
    placeholder="Pilih Kategori"
    allowClear={false}
  />
  <input type="hidden" {...register("category", { required: "Kategori wajib dipilih" })} />
  {errors.category && <p className="form-error">{errors.category.message}</p>}
</div>
```

### Method 2: Using Controller (Recommended for Complex Forms)

```tsx
import { useForm, Controller } from "react-hook-form";

const { control, handleSubmit } = useForm();

<Controller
  name="category"
  control={control}
  rules={{ required: "Kategori wajib dipilih" }}
  render={({ field, fieldState }) => (
    <div>
      <label className="form-label">
        Kategori <span className="text-danger-500">*</span>
      </label>
      <Autocomplete
        options={categoryOptions}
        value={field.value}
        onChange={field.onChange}
        placeholder="Pilih Kategori"
      />
      {fieldState.error && <p className="form-error">{fieldState.error.message}</p>}
    </div>
  )}
/>
```

## 5. Common Use Cases

### Filter Dropdown

```tsx
const [statusFilter, setStatusFilter] = useState("");

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

<Autocomplete
  options={statusOptions}
  value={statusFilter}
  onChange={setStatusFilter}
  placeholder="All Status"
/>
```

### Dynamic Options from API

```tsx
const { data: categories } = useQuery({
  queryKey: ["categories"],
  queryFn: async () => {
    const response = await api.get("/categories");
    return response.data.data;
  },
});

const categoryOptions = categories?.map((cat: any) => ({
  value: cat.id,
  label: cat.name,
})) || [];

<Autocomplete
  options={categoryOptions}
  value={selectedCategory}
  onChange={setSelectedCategory}
  placeholder="Pilih Kategori"
/>
```

### Multiple Filters with Reset

```tsx
const [categoryFilter, setCategoryFilter] = useState("");
const [statusFilter, setStatusFilter] = useState("");
const [currentPage, setCurrentPage] = useState(1);

// Reset to page 1 when filter changes
const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
  setter(value);
  setCurrentPage(1);
};

<Autocomplete
  options={categoryOptions}
  value={categoryFilter}
  onChange={handleFilterChange(setCategoryFilter)}
  placeholder="All Categories"
/>

<Autocomplete
  options={statusOptions}
  value={statusFilter}
  onChange={handleFilterChange(setStatusFilter)}
  placeholder="All Status"
/>
```

## 6. Styling Classes

### Component Structure

```
.autocomplete                          # Container
├── .autocomplete-input-wrapper        # Input wrapper (clickable)
│   ├── .autocomplete-search          # Search input (when open)
│   ├── .autocomplete-display         # Display value (when closed)
│   │   └── .autocomplete-placeholder # Placeholder text
│   └── .autocomplete-icons           # Icons container
│       ├── .autocomplete-clear       # Clear button (X)
│       └── .autocomplete-arrow       # Chevron icon
└── .autocomplete-dropdown             # Dropdown menu
    ├── .autocomplete-options         # Options list
    │   └── .autocomplete-option      # Single option
    │       └── .selected             # Selected option
    └── .autocomplete-empty           # Empty state message
```

### State Classes

```scss
.autocomplete-input-wrapper.open      // When dropdown is open
.autocomplete-input-wrapper.disabled  // When disabled
.autocomplete-option.selected         // Selected option
.autocomplete-arrow.open             // Arrow rotated 180deg
```

## 7. Features

### Searchable
- User dapat mengetik untuk filter options
- Case-insensitive search
- Real-time filtering

### Keyboard Navigation
- **Escape**: Close dropdown
- **Enter**: Select option (when only 1 result)

### Click Outside
- Automatically closes when clicking outside component

### Clear Button
- X icon untuk clear selection
- Optional via `allowClear` prop
- Tidak muncul saat disabled

### Visual Feedback
- Hover states pada semua interactive elements
- Focus state dengan blue border dan shadow
- Selected option highlighted dengan blue background
- Smooth animations (slide down, rotate arrow)

## 8. Accessibility

```tsx
<Autocomplete
  options={options}
  value={value}
  onChange={onChange}
  placeholder="Select option"
  aria-label="Category selection"  // Add for screen readers
/>
```

## 9. Best Practices

### ✅ DO

```tsx
// Use meaningful placeholders
<Autocomplete placeholder="Pilih Kategori" />

// Provide all options for filters
const options = [
  { value: "", label: "All Categories" },  // Include "all"
  ...otherOptions
];

// Keep option labels concise
{ value: "education", label: "Pendidikan" }

// Use allowClear=false for required fields
<Autocomplete allowClear={false} />

// Reset filters properly
const handleCategoryChange = (value: string) => {
  setCategoryFilter(value);
  setCurrentPage(1);  // Reset pagination
};
```

### ❌ DON'T

```tsx
// Don't use long labels
{ value: "education", label: "This is a very long category name..." }

// Don't forget empty option for filters
const options = [
  { value: "education", label: "Pendidikan" }  // Missing "All"
];

// Don't use for non-searchable short lists (use radio buttons)
<Autocomplete options={[
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" }
]} />

// Don't forget to handle empty value
const handleChange = (value: string) => {
  if (value === "") {
    // Handle "All" selection
  }
};
```

## 10. Migration from Select

### Before (Native Select)

```tsx
<select
  className="form-input"
  value={category}
  onChange={(e) => setCategory(e.target.value)}
>
  <option value="">Pilih Kategori</option>
  <option value="pendidikan">Pendidikan</option>
  <option value="kesehatan">Kesehatan</option>
</select>
```

### After (Autocomplete)

```tsx
const categoryOptions = [
  { value: "pendidikan", label: "Pendidikan" },
  { value: "kesehatan", label: "Kesehatan" },
];

<Autocomplete
  options={categoryOptions}
  value={category}
  onChange={setCategory}
  placeholder="Pilih Kategori"
/>
```

## 11. Common Patterns

### Conditional Options

```tsx
const roleOptions = isAdmin
  ? [
      { value: "admin", label: "Admin" },
      { value: "user", label: "User" },
      { value: "guest", label: "Guest" },
    ]
  : [
      { value: "user", label: "User" },
      { value: "guest", label: "Guest" },
    ];
```

### Grouped Filters

```tsx
<div className="filter-container">
  <div className="filter-group">
    <Autocomplete
      options={categoryOptions}
      value={categoryFilter}
      onChange={setCategoryFilter}
      placeholder="All Categories"
    />
  </div>

  <div className="filter-group">
    <Autocomplete
      options={statusOptions}
      value={statusFilter}
      onChange={setStatusFilter}
      placeholder="All Status"
    />
  </div>
</div>
```

### Dependent Dropdowns

```tsx
const [country, setCountry] = useState("");
const [city, setCity] = useState("");

const handleCountryChange = (value: string) => {
  setCountry(value);
  setCity("");  // Reset dependent field
};

const cityOptions = cities.filter(c => c.countryId === country);

<Autocomplete
  options={countryOptions}
  value={country}
  onChange={handleCountryChange}
  placeholder="Select Country"
/>

<Autocomplete
  options={cityOptions}
  value={city}
  onChange={setCity}
  placeholder="Select City"
  disabled={!country}  // Disable until country selected
/>
```

## 12. Performance Considerations

### Large Option Lists

```tsx
// For 100+ options, consider using React.memo or useMemo
const memoizedOptions = useMemo(() =>
  largeDataArray.map(item => ({
    value: item.id,
    label: item.name,
  }))
, [largeDataArray]);

<Autocomplete
  options={memoizedOptions}
  value={value}
  onChange={setValue}
/>
```

### Debounced Search (External API)

```tsx
// For search that hits API, add debounce in parent component
const [searchQuery, setSearchQuery] = useState("");
const debouncedQuery = useDebounce(searchQuery, 300);

useEffect(() => {
  if (debouncedQuery) {
    fetchOptions(debouncedQuery);
  }
}, [debouncedQuery]);
```

## 13. Troubleshooting

### Issue: Dropdown not closing

**Solution**: Ensure `containerRef` click outside logic is working
```tsx
// Already handled in component, check z-index conflicts
```

### Issue: Value not updating in form

**Solution**: Use hidden input with react-hook-form
```tsx
<input type="hidden" {...register("fieldName")} />
```

### Issue: Options not filtering

**Solution**: Check option data structure
```tsx
// Correct format
{ value: "id", label: "Display Name" }
```

---

**Version**: 1.0
**Last Updated**: 2025-01-18
**Maintained by**: Development Team
