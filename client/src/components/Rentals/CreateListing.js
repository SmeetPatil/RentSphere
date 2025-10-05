import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  
  // Manual specification entry
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

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

  const addManualSpecification = () => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      const formattedKey = newSpecKey.toLowerCase().replace(/\s+/g, '_');
      handleSpecificationChange(formattedKey, newSpecValue);
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };

  const removeSpecification = (keyToRemove) => {
    setFormData(prev => ({
      ...prev,
      specifications: Object.fromEntries(
        Object.entries(prev.specifications).filter(([key]) => key !== keyToRemove)
      )
    }));
  };

  const clearAllSpecifications = () => {
    setFormData(prev => ({
      ...prev,
      specifications: {}
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
    const titleLower = title.toLowerCase();
    
    // Advanced brand detection with model extraction
    const brandPatterns = {
      cameras: {
        'Canon': ['eos', 'rebel', '5d', '6d', '7d', '90d', '80d', 't7i', 't8i'],
        'Nikon': ['d850', 'd750', 'd500', 'd3500', 'd5600', 'd7500', 'z6', 'z7'],
        'Sony': ['a7', 'a6000', 'a6300', 'a6400', 'a6500', 'fx', 'alpha'],
        'Fujifilm': ['x-t', 'x-pro', 'x100', 'xt3', 'xt4', 'xt30'],
        'Panasonic': ['gh5', 'gh6', 'g9', 'fz1000', 'lumix'],
        'Olympus': ['om-d', 'pen', 'e-m1', 'e-m5', 'e-m10']
      },
      laptops: {
        'Apple': ['macbook', 'air', 'pro', 'm1', 'm2', 'm3'],
        'Dell': ['xps', 'inspiron', 'latitude', 'alienware', 'precision'],
        'HP': ['spectre', 'envy', 'pavilion', 'elitebook', 'omen'],
        'Lenovo': ['thinkpad', 'ideapad', 'yoga', 'legion', 't14', 't480'],
        'ASUS': ['zenbook', 'vivobook', 'rog', 'tuf', 'expertbook'],
        'Microsoft': ['surface', 'laptop', 'studio', 'book'],
        'Acer': ['swift', 'aspire', 'predator', 'nitro', 'spin']
      },
      drones: {
        'DJI': ['mavic', 'phantom', 'inspire', 'mini', 'air', 'fpv', 'avata'],
        'Parrot': ['anafi', 'bebop', 'disco', 'mambo'],
        'Autel': ['evo', 'nano', 'lite', 'orange'],
        'Skydio': ['skydio 2', 'x2'],
        'Holy Stone': ['hs720', 'hs110d', 'hs100']
      }
    };

    // Detect brand and model
    let detectedBrand = null;
    let detectedModel = '';
    
    if (brandPatterns[category]) {
      for (const [brand, models] of Object.entries(brandPatterns[category])) {
        if (titleLower.includes(brand.toLowerCase()) || 
            models.some(model => titleLower.includes(model))) {
          detectedBrand = brand;
          detectedModel = models.find(model => titleLower.includes(model)) || '';
          break;
        }
      }
    }

    if (detectedBrand) {
      specs.brand = detectedBrand;
      if (detectedModel) {
        specs.model = detectedModel.toUpperCase();
      }
    }

    // Generate comprehensive category-specific specifications
    switch (category) {
      case 'cameras':
        specs.type = detectedBrand === 'Sony' ? 'Mirrorless' : 
                   detectedBrand === 'Canon' ? 'DSLR' : 
                   detectedBrand === 'Fujifilm' ? 'Mirrorless' : 'DSLR';
        specs.sensor_size = titleLower.includes('full frame') ? 'Full Frame' : 
                           titleLower.includes('aps-c') ? 'APS-C' : 'APS-C';
        specs.megapixels = titleLower.includes('50mp') ? '50.6MP' :
                          titleLower.includes('45mp') ? '45.7MP' :
                          titleLower.includes('32mp') ? '32.5MP' :
                          titleLower.includes('24mp') ? '24.2MP' : '24.2MP';
        specs.video_recording = '4K UHD at 30fps';
        specs.iso_range = '100-25600 (expandable to 51200)';
        specs.autofocus_points = detectedBrand === 'Sony' ? '693 phase-detection' : '45 cross-type';
        specs.viewfinder = specs.type === 'Mirrorless' ? '2.36M-dot OLED EVF' : 'Optical pentaprism';
        specs.lcd_screen = '3.2" vari-angle touchscreen';
        specs.battery_life = '420 shots (CIPA rated)';
        specs.storage = 'Dual SD/CFexpress card slots';
        specs.connectivity = 'Wi-Fi, Bluetooth, USB-C';
        specs.weight = detectedBrand === 'Canon' ? '890g (body only)' : '650g (body only)';
        break;
        
      case 'laptops':
        const isApple = detectedBrand === 'Apple';
        const isGaming = titleLower.includes('gaming') || titleLower.includes('rog') || 
                        titleLower.includes('legion') || titleLower.includes('omen');
        
        specs.processor = isApple ? 'Apple M2 Pro 10-core' :
                         isGaming ? 'Intel Core i7-12700H' :
                         titleLower.includes('i9') ? 'Intel Core i9-12900H' :
                         titleLower.includes('i5') ? 'Intel Core i5-12500H' : 'Intel Core i7-12700H';
        specs.graphics = isApple ? 'Integrated 16-core GPU' :
                        isGaming ? 'NVIDIA GeForce RTX 3070' :
                        titleLower.includes('rtx') ? 'NVIDIA GeForce RTX 3060' : 'Intel Iris Xe Graphics';
        specs.ram = titleLower.includes('32gb') ? '32GB DDR4' :
                   titleLower.includes('8gb') ? '8GB DDR4' : '16GB DDR4';
        specs.storage = titleLower.includes('1tb') ? '1TB NVMe SSD' :
                       titleLower.includes('256gb') ? '256GB NVMe SSD' : '512GB NVMe SSD';
        specs.screen_size = titleLower.includes('13') ? '13.3"' :
                           titleLower.includes('17') ? '17.3"' :
                           titleLower.includes('14') ? '14"' : '15.6"';
        specs.display = isGaming ? '1920x1080 144Hz IPS' : '1920x1080 60Hz IPS';
        specs.battery_life = isApple ? 'Up to 18 hours' : isGaming ? 'Up to 6 hours' : 'Up to 10 hours';
        specs.operating_system = isApple ? 'macOS Ventura' : 'Windows 11 Home';
        specs.ports = isApple ? '3x Thunderbolt 4, SDXC, 3.5mm jack' : '2x USB-A, 2x USB-C, HDMI, Ethernet';
        specs.weight = parseFloat(specs.screen_size) <= 14 ? '1.4kg' : '2.1kg';
        specs.keyboard = isGaming ? 'RGB backlit mechanical' : 'Backlit chiclet';
        break;
        
      case 'drones':
        const isDJI = detectedBrand === 'DJI';
        const isMini = titleLower.includes('mini') || titleLower.includes('nano');
        
        specs.camera_resolution = titleLower.includes('4k') ? '4K UHD' :
                                 titleLower.includes('2.7k') ? '2.7K' : '4K UHD';
        specs.gimbal = isDJI ? '3-axis mechanical gimbal' : '2-axis gimbal';
        specs.max_flight_time = isMini ? '31 minutes' :
                               titleLower.includes('pro') ? '46 minutes' : '34 minutes';
        specs.max_transmission_range = isDJI ? '10km (FCC)' : '4km';
        specs.max_speed = isMini ? '16 m/s (Sport mode)' : '19 m/s (Sport mode)';
        specs.weight = isMini ? '249g' :
                      titleLower.includes('pro') ? '907g' : '570g';
        specs.obstacle_sensing = isDJI ? 'Omnidirectional' : 'Forward and downward';
        specs.intelligent_modes = 'QuickShots, ActiveTrack, Point of Interest';
        specs.storage = 'Internal 8GB + microSD up to 256GB';
        specs.controller = isDJI ? 'DJI RC with 5.5" screen' : 'Smartphone mount controller';
        specs.operating_temperature = '-10°C to 40°C';
        specs.wind_resistance = 'Level 5 (up to 10.7 m/s)';
        break;
        
      case 'gaming consoles':
        const isPlayStation = detectedBrand === 'Sony' || titleLower.includes('playstation') || titleLower.includes('ps5');
        const isXbox = detectedBrand === 'Microsoft' || titleLower.includes('xbox');
        const isSwitch = detectedBrand === 'Nintendo' || titleLower.includes('switch');
        
        if (isPlayStation) {
          specs.model = titleLower.includes('ps5') ? 'PlayStation 5' : 'PlayStation 4 Pro';
          specs.processor = 'Custom AMD Zen 2 8-core';
          specs.graphics = 'Custom AMD RDNA 2 GPU';
          specs.memory = '16GB GDDR6';
          specs.storage = titleLower.includes('digital') ? '825GB SSD (Digital Edition)' : '825GB SSD';
          specs.max_resolution = '4K UHD (2160p)';
          specs.hdr_support = 'HDR10';
          specs.audio = '3D Audio with Tempest Engine';
          specs.backwards_compatibility = 'PS4 games compatible';
        } else if (isXbox) {
          specs.model = titleLower.includes('series x') ? 'Xbox Series X' : 'Xbox Series S';
          specs.processor = 'Custom AMD Zen 2 8-core';
          specs.graphics = titleLower.includes('series x') ? 'Custom AMD RDNA 2 12 TFLOPS' : 'Custom AMD RDNA 2 4 TFLOPS';
          specs.memory = '16GB GDDR6';
          specs.storage = titleLower.includes('series x') ? '1TB NVMe SSD' : '512GB NVMe SSD';
          specs.max_resolution = titleLower.includes('series x') ? '4K UHD (2160p)' : '1440p (upscaled to 4K)';
          specs.backwards_compatibility = 'Xbox One, Xbox 360, Original Xbox';
        } else if (isSwitch) {
          specs.model = titleLower.includes('oled') ? 'Nintendo Switch OLED' : 'Nintendo Switch';
          specs.display = titleLower.includes('oled') ? '7" OLED touchscreen' : '6.2" LCD touchscreen';
          specs.resolution_docked = '1920x1080 (TV mode)';
          specs.resolution_handheld = '1280x720 (Handheld mode)';
          specs.storage = '32GB internal + microSDXC up to 2TB';
          specs.battery_life = '4.5 - 9 hours';
          specs.controllers = 'Joy-Con controllers included';
        }
        specs.connectivity = 'Wi-Fi, Bluetooth, Ethernet (adapter may be required)';
        specs.included_controllers = '1 wireless controller';
        break;
        
      case 'headphones':
        const isWireless = titleLower.includes('wireless') || titleLower.includes('bluetooth');
        const isNoiseCancelling = titleLower.includes('noise') || titleLower.includes('anc');
        const isOverEar = titleLower.includes('over') || !titleLower.includes('in-ear');
        
        specs.type = isOverEar ? 'Over-ear' : 'In-ear';
        specs.connectivity = isWireless ? 'Wireless (Bluetooth 5.0) + Wired' : 'Wired (3.5mm)';
        specs.noise_cancelling = isNoiseCancelling ? 'Active Noise Cancelling (ANC)' : 'Passive isolation';
        specs.driver_size = isOverEar ? '40mm dynamic drivers' : '9mm dynamic drivers';
        specs.frequency_response = '20Hz - 20kHz';
        specs.impedance = isOverEar ? '32 ohms' : '16 ohms';
        specs.battery_life = isWireless ? (isNoiseCancelling ? '30 hours (ANC off), 20 hours (ANC on)' : '40 hours') : 'N/A';
        specs.charging = isWireless ? 'USB-C, Quick charge (15 min = 3 hours)' : 'N/A';
        specs.weight = isOverEar ? '250g' : '6g per earbud';
        specs.controls = isWireless ? 'Touch controls + voice assistant' : 'Inline remote';
        specs.microphone = 'Built-in microphone for calls';
        specs.compatibility = 'iOS, Android, Windows, Mac';
        if (detectedBrand === 'Sony') {
          specs.special_features = 'LDAC codec, 360 Reality Audio';
        } else if (detectedBrand === 'Bose') {
          specs.special_features = 'Bose QuietComfort technology';
        }
        break;
        
      default:
        // Generic specifications for other categories
        specs.condition = 'Excellent';
        specs.age = titleLower.includes('new') ? 'Brand new' : 
                   titleLower.includes('2024') ? 'Less than 1 year' : '1-2 years';
        specs.warranty = 'Manufacturer warranty included';
        specs.original_packaging = 'Yes, with all original accessories';
        specs.usage_hours = 'Light usage, well maintained';
    }
    
    // Add common specifications for all items
    specs.condition = specs.condition || 'Excellent';
    specs.included_accessories = 'All original accessories and manuals';
    specs.rental_requirements = 'Valid ID and security deposit required';
    
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
                <div className="spec-buttons">
                  <button
                    type="button"
                    onClick={generateSpecifications}
                    className="ai-generate-btn"
                    disabled={loading}
                  >
                    🤖 Generate with AI
                  </button>
                  {Object.keys(formData.specifications).length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllSpecifications}
                      className="clear-specs-btn"
                    >
                      🗑️ Clear All
                    </button>
                  )}
                </div>
              </div>
              
              {/* Manual Specification Entry */}
              <div className="manual-spec-entry">
                <div className="form-row">
                  <div className="form-group">
                    <label>Specification Name</label>
                    <input
                      type="text"
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      placeholder="e.g., Brand, Model, Color"
                    />
                  </div>
                  <div className="form-group">
                    <label>Value</label>
                    <input
                      type="text"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      placeholder="e.g., Canon, EOS R5, Black"
                    />
                  </div>
                  <div className="form-group">
                    <label>&nbsp;</label>
                    <button
                      type="button"
                      onClick={addManualSpecification}
                      className="add-spec-btn"
                      disabled={!newSpecKey.trim() || !newSpecValue.trim()}
                    >
                      ➕ Add
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Existing Specifications */}
              <div className="specifications-grid">
                {Object.entries(formData.specifications).map(([key, value]) => (
                  <div key={key} className="spec-item">
                    <div className="form-group">
                      <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                      <div className="spec-input-group">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleSpecificationChange(key, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecification(key)}
                          className="remove-spec-btn"
                          title="Remove this specification"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {Object.keys(formData.specifications).length === 0 && (
                  <div className="no-specs">
                    <p>📋 No specifications added yet</p>
                    <p>Use AI generation for smart detection or add specifications manually above.</p>
                  </div>
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