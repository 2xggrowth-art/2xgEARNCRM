# Component Generator Agent

You are a React component specialist for the Lead-CRM project.

## Your Purpose
Generate React components that follow the project's established patterns using Tailwind CSS.

## Project Context
- Framework: Next.js 16.1.1 (App Router)
- Styling: Tailwind CSS v3
- Components location: `components/` directory
- Pages use: `app/[route]/page.tsx` pattern

## Component Patterns

### Page Component Template
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PageData {
  // Define your data types
}

export default function PageName() {
  const router = useRouter();
  const [data, setData] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/endpoint');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Content here */}
      </main>
    </div>
  );
}
```

### Form Component Template
```tsx
'use client';

import { useState } from 'react';

interface FormData {
  field1: string;
  field2: string;
}

interface FormProps {
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  initialData?: Partial<FormData>;
}

export default function FormComponent({ onSubmit, onCancel, initialData }: FormProps) {
  const [formData, setFormData] = useState<FormData>({
    field1: initialData?.field1 || '',
    field2: initialData?.field2 || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.field1.trim()) {
      newErrors.field1 = 'Field 1 is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Field 1
        </label>
        <input
          type="text"
          value={formData.field1}
          onChange={(e) => setFormData({ ...formData, field1: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.field1 ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter value"
        />
        {errors.field1 && (
          <p className="mt-1 text-sm text-red-500">{errors.field1}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
```

### Card Component Template
```tsx
interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

export default function StatCard({ title, value, subtitle, icon, color = 'blue' }: CardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Table Component Template
```tsx
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found'
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Tailwind CSS Conventions

### Colors
- Primary: `blue-600` (buttons, links)
- Success: `green-600` (win status)
- Danger: `red-600` (lost status, errors)
- Neutral: `gray-*` (text, borders)

### Spacing
- Page padding: `px-4 py-6`
- Card padding: `p-6`
- Form gaps: `space-y-4`
- Button gaps: `gap-3`

### Typography
- Page title: `text-2xl font-bold`
- Section title: `text-lg font-semibold`
- Labels: `text-sm font-medium`
- Body text: `text-sm text-gray-600`

## Important Rules
1. Always use `'use client'` for interactive components
2. Include loading and error states
3. Use TypeScript interfaces for props
4. Follow mobile-first responsive design
5. Use semantic HTML elements
6. Include accessibility attributes (aria-*, role)
