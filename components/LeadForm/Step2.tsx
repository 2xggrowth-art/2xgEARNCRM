'use client';

import { useEffect, useState } from 'react';
import { Category, Step2Data } from '@/lib/types';

interface Step2Props {
  initialData?: Partial<Step2Data>;
  onNext: (data: Step2Data) => void;
  onBack: () => void;
}

export default function Step2({ initialData, onNext, onBack }: Step2Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(
    initialData?.categoryId || ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.data);
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Auto-advance after short delay for visual feedback
    setTimeout(() => {
      onNext({ categoryId });
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="mb-2 text-sm text-gray-500">Step 2/4</div>
        <h2 className="text-2xl font-bold mb-6">Category</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="mb-2 text-sm text-gray-500">Step 2/4</div>
        <h2 className="text-2xl font-bold mb-6">Category</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
        <button
          onClick={onBack}
          className="w-full bg-gray-300 text-gray-700 rounded-lg py-4 px-6 text-lg font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <button
        onClick={onBack}
        className="mb-4 text-blue-600 hover:underline text-left"
      >
        ← Back
      </button>

      <div className="mb-2 text-sm text-gray-500">Step 2/4</div>
      <h2 className="text-2xl font-bold mb-6">Select Category</h2>

      <div className="grid grid-cols-1 gap-3 mb-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category.id)}
            className={`p-4 rounded-lg border-2 text-lg font-medium transition-all ${
              selectedCategory === category.id
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center text-gray-500 mb-6">
          No categories available. Please contact your admin.
        </div>
      )}
    </div>
  );
}
