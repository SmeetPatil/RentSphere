import React from 'react';

const CategoryGrid = ({ categories, onCategorySelect }) => {
  // Category icons mapping
  const categoryIcons = {
    cameras: '📷',
    drones: '🚁',
    headphones: '🎧',
    laptops: '💻',
    phones: '📱',
    smartwatches: '⌚',
    tablets: '📱',
    tv: '📺',
    projectors: '📽️',
    speakers: '🔊',
    'gaming consoles': '🎮',
    controllers: '🎮'
  };

  const getCategoryIcon = (categoryName) => {
    return categoryIcons[categoryName] || '📦';
  };

  const getCategoryCount = (category) => {
    // This would typically come from the API
    // For now, we'll show placeholder counts
    if (category.subcategories) {
      return `${category.subcategories.length} types`;
    }
    return 'Available';
  };

  return (
    <div className="categories-grid">
      {categories.map(category => (
        <div
          key={category.name}
          className="category-card"
          onClick={() => onCategorySelect(category.name)}
        >
          <span className="category-icon">
            {getCategoryIcon(category.name)}
          </span>
          <div className="category-name">
            {category.displayName}
          </div>
          <div className="category-count">
            {getCategoryCount(category)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryGrid;