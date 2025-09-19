import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Rentals.css';

const CreateListing = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const [formData, setFormData] = useState({
    category: '',
    subcategory: '',
    title: '',
    description: '',
    pricePerDay: '',
    images: [],
    specifications: {},
    address: '',
    latitude: '',
    longitude: ''
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setUserLocation({ lat, lng });
          setFormData(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString()
          }));
          
          // For now, we'll let user enter address manually
          // In the future, you can implement reverse geocoding here
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Location access is required to create a listing');
          setLocationLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
      setLocationLoading(false);
    }
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        if (response.data.success) {
          setCategories(response.data.categories);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Reset subcategory when category changes
    if (field === 'category') {
      setFormData(prev => ({
        ...prev,
        subcategory: ''
      }));
    }
  };

  const handleSpecificationChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }));
  };

  const getCurrentCategory = () => {
    return categories.find(cat => cat.name === formData.category);
  };

  const generateSpecifications = async () => {
    if (!formData.title || !formData.category) {
      alert('Please enter a title and select a category first');
      return;
    }

    setLoading(true);
    try {
      // Simulate AI-powered specification generation
      // In a real implementation, you would call an AI service like OpenAI
      const mockSpecs = generateMockSpecifications(formData.category, formData.title);
      
      setFormData(prev => ({
        ...prev,
        specifications: mockSpecs
      }));
      
      alert('Specifications generated! You can edit them if needed.');
    } catch (err) {
      console.error('Error generating specifications:', err);
      alert('Failed to generate specifications. Please add them manually.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockSpecifications = (category, title) => {
    const specs = {};
    
    // Extract brand from title (simple approach)
    const commonBrands = {
      cameras: ['Canon', 'Nikon', 'Sony', 'Fujifilm'],
      laptops: ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS'],
      drones: ['DJI', 'Parrot', 'Autel'],
      'gaming consoles': ['Sony', 'Microsoft', 'Nintendo'],
      headphones: ['Sony', 'Bose', 'Audio-Technica', 'Sennheiser'],
      speakers: ['JBL', 'Bose', 'Sony', 'Marshall']
    };

    const brands = commonBrands[category] || [];
    const detectedBrand = brands.find(brand => 
      title.toLowerCase().includes(brand.toLowerCase())
    );

    if (detectedBrand) {
      specs.brand = detectedBrand;
    }

    // Add category-specific specifications
    switch (category) {
      case 'cameras':
        specs.type = 'DSLR';
        specs.megapixels = '24MP';
        specs.video = '4K';
        specs.lens_mount = 'EF';
        break;
      case 'laptops':
        specs.processor = 'Intel i7';
        specs.ram = '16GB';
        specs.storage = '512GB SSD';
        specs.screen_size = '15.6"';
        break;
      case 'drones':
        specs.camera = '4K';
        specs.flight_time = '30 minutes';
        specs.range = '10km';
        specs.weight = '900g';
        break;
      case 'gaming consoles':
        specs.storage = '1TB';
        specs.resolution = '4K';
        specs.controllers = '1';
        break;
      case 'headphones':
        specs.type = 'Over-ear';
        specs.wireless = 'Yes';
        specs.noise_cancelling = 'Yes';
        specs.battery_life = '30 hours';
        break;
      default:
        specs.condition = 'Excellent';
        specs.warranty = 'Available';
    }

    return specs;
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > 5) {
      alert('Maximum 5 images allowed per listing');
      return;
    }

    // Validate file types and sizes
    const validFiles = [];
    const previews = [];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum 5MB per image.`);
        return;
      }

      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert(`${file.name} must be JPEG or PNG format`);
        return;
      }

      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push({
          file: file,
          preview: e.target.result,
          name: file.name,
          size: file.size
        });
        
        if (previews.length === validFiles.length) {
          setImagePreview(previews);
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages(validFiles);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreview(newPreviews);
  };

  const uploadImages = async (listingId) => {
    if (selectedImages.length === 0) return [];

    setImageUploading(true);
    try {
      const formData = new FormData();
      selectedImages.forEach(image => {
        formData.append('images', image);
      });

      const response = await axios.post(`/api/upload-images/${listingId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        return response.data.images;
      }
      throw new Error(response.data.message);
    } catch (err) {
      console.error('Error uploading images:', err);
      throw err;
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userLocation) {
      setError('Location is required to create a listing');
      return;
    }

    if (selectedImages.length === 0) {
      setError('Please add at least one image of your rental item');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First create the listing
      const response = await axios.post('/api/listings', {
        ...formData,
        pricePerDay: parseFloat(formData.pricePerDay)
      });

      if (response.data.success) {
        const listingId = response.data.listing.id;
        
        // Then upload images
        try {
          await uploadImages(listingId);
          setSuccess(true);
          setTimeout(() => {
            navigate('/my-listings');
          }, 2000);
        } catch (imageError) {
          // Listing created but image upload failed
          setError('Listing created but failed to upload images. You can add images later from "My Listings".');
          setTimeout(() => {
            navigate('/my-listings');
          }, 3000);
        }
      }
    } catch (err) {
      console.error('Error creating listing:', err);
      setError(err.response?.data?.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (locationLoading) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Getting your location...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="success-message">
            <h2>🎉 Listing Created Successfully!</h2>
            <p>Your rental listing has been created and is now live.</p>
            <p>Redirecting to your listings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rentals-page">
      <div className="rentals-container">
        {/* Header */}
        <div className="rentals-header">
          <div className="header-left">
            <Link to="/dashboard" className="back-to-dashboard-btn">
              ← Dashboard
            </Link>
            <h1 className="rentals-title">Create New Listing</h1>
          </div>
        </div>

        {/* Form */}
        <div className="create-listing-form">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Category Selection */}
            <div className="form-section">
              <h3>Category & Type</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {getCurrentCategory()?.subcategories && (
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={formData.subcategory}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                    >
                      <option value="">Select type (optional)</option>
                      {getCurrentCategory().subcategories.map(subcat => (
                        <option key={subcat.name} value={subcat.name}>
                          {subcat.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Canon EOS R5 Professional Camera"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your item, its condition, what's included, etc."
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>Price per Day (₹) *</label>
                <input
                  type="number"
                  value={formData.pricePerDay}
                  onChange={(e) => handleInputChange('pricePerDay', e.target.value)}
                  placeholder="e.g., 1500"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Specifications */}
            <div className="form-section">
              <div className="section-header">
                <h3>Specifications</h3>
                <button
                  type="button"
                  onClick={generateSpecifications}
                  className="ai-generate-btn"
                  disabled={loading}
                >
                  🤖 Generate with AI
                </button>
              </div>
              
              <div className="specifications-grid">
                {Object.entries(formData.specifications).map(([key, value]) => (
                  <div key={key} className="form-group">
                    <label>{key.replace(/_/g, ' ').toUpperCase()}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleSpecificationChange(key, e.target.value)}
                    />
                  </div>
                ))}
                
                {Object.keys(formData.specifications).length === 0 && (
                  <p className="no-specs">
                    Click "Generate with AI" to automatically detect specifications, 
                    or add them manually by selecting a category and entering a title first.
                  </p>
                )}
              </div>
            </div>

            {/* Images */}
            <div className="form-section">
              <h3>Images *</h3>
              <div className="form-group">
                <label>Upload Images (Max 5, 5MB each)</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png"
                  onChange={handleImageSelect}
                  style={{
                    padding: '12px',
                    border: '2px dashed #e2e8f0',
                    borderRadius: '8px',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                />
                <small>Upload clear photos of your item. JPEG/PNG only, max 5MB each.</small>
              </div>

              {/* Image Previews */}
              {imagePreview.length > 0 && (
                <div className="image-preview-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '15px',
                  marginTop: '15px'
                }}>
                  {imagePreview.map((img, index) => (
                    <div key={index} style={{
                      position: 'relative',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={img.preview}
                        alt={`Preview ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '25px',
                          height: '25px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ×
                      </button>
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}>
                        {(img.size / 1024 / 1024).toFixed(1)}MB
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedImages.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  border: '2px dashed #e2e8f0',
                  borderRadius: '8px',
                  marginTop: '10px',
                  color: '#666'
                }}>
                  📸 No images selected. Please add at least one image of your rental item.
                </div>
              )}
            </div>

            {/* Location */}
            <div className="form-section">
              <h3>Location</h3>
              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter your address or area"
                  required
                />
                <small>Your exact location will be used for distance calculations but won't be shown to renters until booking.</small>
              </div>
            </div>

            {/* Submit */}
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                disabled={loading || imageUploading}
              >
                {loading && !imageUploading && 'Creating Listing...'}
                {imageUploading && 'Uploading Images...'}
                {!loading && !imageUploading && 'Create Listing'}
              </button>
              <Link to="/dashboard" className="cancel-btn">
                Cancel
              </Link>
            </div>
            
            {(loading || imageUploading) && (
              <div style={{ textAlign: 'center', marginTop: '15px', color: '#666' }}>
                {loading && !imageUploading && '📝 Creating your listing...'}
                {imageUploading && '📸 Uploading images to Google Drive...'}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateListing;