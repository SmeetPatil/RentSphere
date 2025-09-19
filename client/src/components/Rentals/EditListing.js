import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './Rentals.css';

const EditListing = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

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

  // Fetch listing data for editing
  useEffect(() => {
    const fetchListing = async () => {
      try {
        setInitialLoading(true);
        const response = await axios.get(`/api/listings/${id}/edit`);
        
        if (response.data.success) {
          const listing = response.data.listing;
          setFormData({
            category: listing.category || '',
            subcategory: listing.subcategory || '',
            title: listing.title || '',
            description: listing.description || '',
            pricePerDay: listing.price_per_day?.toString() || '',
            images: listing.images || [],
            specifications: listing.specifications || {},
            address: listing.address || '',
            latitude: listing.latitude?.toString() || '',
            longitude: listing.longitude?.toString() || ''
          });
        } else {
          setError('Failed to load listing details');
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError(err.response?.data?.message || 'Failed to load listing details');
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id]);

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

  const uploadNewImages = async () => {
    if (selectedImages.length === 0) return;

    setImageUploading(true);
    try {
      const formDataUpload = new FormData();
      selectedImages.forEach(image => {
        formDataUpload.append('images', image);
      });

      const response = await axios.post(`/api/upload-images/${id}`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Update form data with new images
        setFormData(prev => ({
          ...prev,
          images: response.data.images
        }));
        setSelectedImages([]);
        setImagePreview([]);
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
    
    setLoading(true);
    setError(null);

    try {
      // Upload new images if any
      if (selectedImages.length > 0) {
        await uploadNewImages();
      }

      // Update the listing
      const response = await axios.put(`/api/listings/${id}`, {
        ...formData,
        pricePerDay: parseFloat(formData.pricePerDay)
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/my-listings');
        }, 2000);
      }
    } catch (err) {
      console.error('Error updating listing:', err);
      setError(err.response?.data?.message || 'Failed to update listing');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading listing details...</p>
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
            <h2>✅ Listing Updated Successfully!</h2>
            <p>Your rental listing has been updated.</p>
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
            <Link to="/my-listings" className="back-to-dashboard-btn">
              ← My Listings
            </Link>
            <h1 className="rentals-title">Edit Listing</h1>
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

            {/* Current Images */}
            {formData.images && formData.images.length > 0 && (
              <div className="form-section">
                <h3>Current Images</h3>
                <div className="image-preview-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '15px'
                }}>
                  {formData.images.map((imageUrl, index) => (
                    <div key={index} style={{
                      position: 'relative',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={imageUrl}
                        alt={`Current ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover'
                        }}
                      />
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
                        Current Image {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images */}
            <div className="form-section">
              <h3>Replace Images (Optional)</h3>
              <div className="form-group">
                <label>Upload New Images (Max 5, 5MB each)</label>
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
                <small>Upload new images to replace current ones. JPEG/PNG only, max 5MB each.</small>
              </div>

              {/* New Image Previews */}
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
                      border: '2px solid #ea580c',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={img.preview}
                        alt={`New Preview ${index + 1}`}
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
                        background: 'rgba(234, 88, 12, 0.9)',
                        color: 'white',
                        padding: '4px',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}>
                        NEW - {(img.size / 1024 / 1024).toFixed(1)}MB
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Specifications */}
            <div className="form-section">
              <h3>Specifications</h3>
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
                    No specifications available. You can add them manually.
                  </p>
                )}
              </div>
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
                <small>Your exact location will be used for distance calculations.</small>
              </div>
            </div>

            {/* Submit */}
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                disabled={loading || imageUploading}
              >
                {loading && !imageUploading && 'Updating Listing...'}
                {imageUploading && 'Uploading Images...'}
                {!loading && !imageUploading && 'Update Listing'}
              </button>
              <Link to="/my-listings" className="cancel-btn">
                Cancel
              </Link>
            </div>
            
            {(loading || imageUploading) && (
              <div style={{ textAlign: 'center', marginTop: '15px', color: '#666' }}>
                {loading && !imageUploading && '📝 Updating your listing...'}
                {imageUploading && '📸 Uploading new images to Google Drive...'}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditListing;