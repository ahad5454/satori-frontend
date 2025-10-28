import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { labFeesAPI } from '../services/api';
import './LabTests.css';

const LabTests = () => {
  const [labs, setLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null); // Currently selected laboratory
  const [categories, setCategories] = useState([]); // Categories for selected lab
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [quantities, setQuantities] = useState({}); // Track quantities for each test
  const [selectedTurnTime, setSelectedTurnTime] = useState(null); // Track selected turnaround time
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newTest, setNewTest] = useState({ name: '', description: '', category: '', pricing: [] });
  const [currentTestPricing, setCurrentTestPricing] = useState([]);

  useEffect(() => {
    fetchLabs();
  }, []);

  // Fetch categories when lab is selected
  useEffect(() => {
    if (selectedLab) {
      fetchCategoriesForLab(selectedLab.id);
    }
  }, [selectedLab]);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching laboratories...');
      
      // Fetch all laboratories
      const labsData = await labFeesAPI.getLabs();
      console.log('Received labs:', labsData);
      setLabs(labsData);
      
      // Select first lab if available
      if (labsData.length > 0) {
        setSelectedLab(labsData[0]);
      }
    } catch (err) {
      console.error('Error fetching laboratories:', err);
      setError(`Failed to load laboratories: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesForLab = async (labId) => {
    try {
      console.log('Fetching categories for lab:', labId);
      const categoriesData = await labFeesAPI.getCategories(labId);
      
      // Fetch tests for each category
      const categoriesWithTests = await Promise.all(
        categoriesData.map(async (category) => {
          const tests = await labFeesAPI.getTests(category.id);
          
          // Fetch rates for each test
          const testsWithRates = await Promise.all(
            tests.map(async (test) => {
              const rates = await labFeesAPI.getRates(test.id);
              return {
                ...test,
                rates: rates.map(rate => ({
                  ...rate,
                  turn_time: rate.turn_time.label,
                  hours: rate.turn_time.hours
                }))
              };
            })
          );
          
          return {
            ...category,
            tests: testsWithRates
          };
        })
      );
      
      console.log('Categories with tests:', categoriesWithTests);
      setCategories(categoriesWithTests);
      
      // Select first category if available
      if (categoriesWithTests.length > 0) {
        setSelectedCategory(categoriesWithTests[0]);
        if (categoriesWithTests[0].tests && categoriesWithTests[0].tests.length > 0) {
          setSelectedTest(categoriesWithTests[0].tests[0]);
        }
      } else {
        setSelectedCategory(null);
        setSelectedTest(null);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(`Failed to load categories: ${err.message || err.toString()}`);
    }
  };

  const handleLabChange = async (lab) => {
    setSelectedLab(lab);
    setSelectedCategory(null);
    setSelectedTest(null);
    setQuantities({});
    setSelectedTurnTime(null);
  };

  const handleSeedData = async () => {
    try {
      await labFeesAPI.seedData();
      await fetchLabs(); // Refresh laboratories
      if (selectedLab) {
        await fetchCategoriesForLab(selectedLab.id);
      }
    } catch (err) {
      setError('Failed to seed data. Please try again.');
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedTest(null);
    setQuantities({});
    setSelectedTurnTime(null);
    
    // If category has tests, select the first one
    if (category.tests && category.tests.length > 0) {
      setSelectedTest(category.tests[0]);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getTurnTimeColor = (hours) => {
    if (hours <= 6) return '#e74c3c'; // Red for urgent
    if (hours <= 24) return '#f39c12'; // Orange for same day
    if (hours <= 72) return '#f1c40f'; // Yellow for 2-3 days
    return '#27ae60'; // Green for standard
  };

  const handleQuantityChange = (testName, turnTime, quantity) => {
    const numQuantity = parseInt(quantity) || 0;
    const key = `${testName}-${turnTime}`;
    setQuantities(prev => ({
      ...prev,
      [key]: numQuantity
    }));
  };

  const calculateTotalCost = () => {
    let total = 0;
    Object.entries(quantities).forEach(([key, quantity]) => {
      if (quantity > 0) {
        const [testName, turnTime] = key.split('-');
        // Find the test in the selected category
        let foundTest = null;
        if (selectedCategory && selectedCategory.tests) {
          foundTest = selectedCategory.tests.find(t => t.name === testName);
        }
        if (foundTest) {
          // Find the rate for the specific turnaround time
          const rate = foundTest.rates?.find(r => {
            const rateTurnTime = typeof r.turn_time === 'string' ? r.turn_time : r.turn_time?.label || 'unknown';
            return rateTurnTime === turnTime;
          });
          if (rate) {
            total += rate.price * quantity;
          }
        }
      }
    });
    return total;
  };

  const getQuantityForTurnaround = (testName, turnTime) => {
    // Ensure turnTime is a string
    const turnTimeStr = typeof turnTime === 'string' ? turnTime : turnTime?.label || 'unknown';
    const key = `${testName}-${turnTimeStr}`;
    return quantities[key] || 0;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading lab test data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={fetchLabs} className="retry-btn">
            Retry
          </button>
          <button onClick={handleSeedData} className="seed-btn">
            Seed Sample Data
          </button>
        </div>
      </div>
    );
  }

  if (!labs || labs.length === 0) {
    return (
      <div className="no-data-container">
        <div className="no-data-message">
          <h2>📋 No Laboratories Available</h2>
          <p>No laboratories found. Click below to seed sample data.</p>
          <button onClick={handleSeedData} className="seed-btn">
            Seed Sample Data
          </button>
        </div>
      </div>
    );
  }

  if (!labs || labs.length === 0) {
    return (
      <div className="no-data-container">
        <div className="no-data-message">
          <h2>📋 No Laboratories Available</h2>
          <p>No laboratories found. Click below to seed sample data.</p>
          <button onClick={handleSeedData} className="seed-btn">
            Seed Sample Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-tests-container">
      <nav className="lab-tests-nav">
        <Link to="/" className="nav-link">
          🏠 Home
        </Link>
        <div className="nav-title">
          <h1>🧪 Lab Test Services</h1>
        </div>
        <button 
          className="add-category-btn"
          onClick={() => setShowAddCategoryModal(true)}
        >
          ➕ Add New Category
        </button>
      </nav>
      
      <header className="lab-tests-header">
        <p>Comprehensive laboratory testing services with flexible turnaround times</p>
      </header>

      <div className="lab-tests-content">
        {/* Laboratory Selector and Categories Sidebar */}
        <div className="categories-sidebar">
          <div className="lab-selector-section">
            <h3>Select Laboratory</h3>
            <select 
              value={selectedLab?.id || ''} 
              onChange={(e) => {
                const lab = labs.find(l => l.id === parseInt(e.target.value));
                if (lab) handleLabChange(lab);
              }}
              className="lab-dropdown large"
            >
              {labs.map(lab => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
          </div>

          <h3>Service Categories</h3>
          <div className="categories-list">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`category-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                <div className="category-name">{category.name}</div>
                <div className="category-description">{category.description}</div>
                <div className="test-count">
                  {category.tests ? category.tests.length : 0} tests
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {selectedCategory && (
            <>
              <div className="category-header">
                <div className="category-title">
                  <h2>{selectedCategory.name}</h2>
                  <p>{selectedCategory.description}</p>
                </div>
                <button 
                  className="add-test-btn"
                  onClick={() => {
                    setNewTest({ ...newTest, category: selectedCategory.name });
                    setShowAddTestModal(true);
                  }}
                >
                  ➕ Add New Test
                </button>
              </div>

              {/* Tests Grid */}
              <div className="tests-grid">
                {selectedCategory.tests && selectedCategory.tests.length > 0 ? (
                  selectedCategory.tests.map((test) => (
                    <div
                      key={test.id}
                      className={`test-card ${
                        selectedTest?.id === test.id ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedTest(test)}
                    >
                      <h4>{test.name}</h4>
                      <div className="test-rates-preview">
                        {test.rates && test.rates.length > 0 && (
                          <>
                            <div className="min-price">
                              From {formatPrice(Math.min(...test.rates.map(r => r.price)))}
                            </div>
                            <div className="turn-times-count">
                              {test.rates.length} turnaround options
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-tests">
                    <p>No tests available for this category.</p>
                  </div>
                )}
              </div>

              {/* Detailed Pricing */}
              {selectedTest && (
                <div className="pricing-details">
                  <h3>📊 Pricing Details: {selectedTest.name}</h3>

                  <div className="pricing-table">
                    <div className="pricing-header">
                      <div>Quantity</div>
                      <div>Turnaround Time</div>
                      <div>Price</div>
                      <div>Total</div>
                    </div>
                    {selectedTest.rates
                      .sort((a, b) => a.hours - b.hours)
                      .map((rate) => {
                        // Ensure turn_time is a string
                        const turnTimeStr = typeof rate.turn_time === 'string' ? rate.turn_time : rate.turn_time?.label || 'unknown';
                        const quantity = getQuantityForTurnaround(selectedTest.name, turnTimeStr);
                        const isSelected = selectedTurnTime === turnTimeStr;
                        const totalCost = quantity > 0 ? rate.price * quantity : 0;
                        
                        return (
                          <div 
                            key={`${rate.id}-${turnTimeStr}-${rate.hours}`} 
                            className={`pricing-row ${isSelected ? 'selected' : ''}`}
                          >
                            <div className="quantity-controls">
                              <button 
                                className="quantity-btn minus-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(selectedTest.name, turnTimeStr, Math.max(0, quantity - 1));
                                }}
                                disabled={quantity <= 0}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={quantity}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const newQuantity = Math.max(0, parseInt(e.target.value) || 0);
                                  handleQuantityChange(selectedTest.name, turnTimeStr, newQuantity);
                                }}
                                className="quantity-input"
                                placeholder="0"
                              />
                              <button 
                                className="quantity-btn plus-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(selectedTest.name, turnTimeStr, quantity + 1);
                                }}
                              >
                                +
                              </button>
                            </div>
                            <div 
                              className="turn-time"
                              onClick={() => setSelectedTurnTime(turnTimeStr)}
                            >
                              <span
                                className="turn-time-indicator"
                                style={{ backgroundColor: getTurnTimeColor(rate.hours) }}
                              ></span>
                              {turnTimeStr}
                            </div>
                            <div className="price">{formatPrice(rate.price)}</div>
                            <div className="total-cost">
                              {quantity > 0 ? formatPrice(totalCost) : '-'}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Total Cost Summary */}
      {Object.values(quantities).some(q => q > 0) && (
        <div className="total-cost-summary">
          <div className="summary-container">
            <h3>💰 Order Summary</h3>
            <div className="summary-details">
              <div className="summary-item">
                <span>Total Cost:</span>
                <span className="total-cost-amount">{formatPrice(calculateTotalCost())}</span>
              </div>
            </div>
            <div className="order-breakdown">
              {Object.entries(quantities).map(([key, quantity]) => {
                if (quantity > 0) {
                  const [testName, turnTime] = key.split('-');
                  // Find the test in the selected category
                  let foundTest = null;
                  if (selectedCategory && selectedCategory.tests) {
                    foundTest = selectedCategory.tests.find(t => t.name === testName);
                  }
                  const rate = foundTest?.rates?.find(r => {
                    const rateTurnTime = typeof r.turn_time === 'string' ? r.turn_time : r.turn_time?.label || 'unknown';
                    return rateTurnTime === turnTime;
                  });
                  if (rate) {
                    return (
                      <div key={key} className="breakdown-item">
                        <span>{selectedCategory?.name} ({selectedLab?.name}): {testName} ({turnTime}) ×{quantity}</span>
                        <span>{formatPrice(rate.price * quantity)}</span>
                      </div>
                    );
                  }
                }
                return null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>➕ Add New Category</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await labFeesAPI.createCategory(newCategory, selectedLab.id);
                await fetchCategoriesForLab(selectedLab.id); // Refresh the categories
                setShowAddCategoryModal(false);
                setNewCategory({ name: '', description: '' });
                alert('Category created successfully!');
              } catch (error) {
                alert('Error creating category: ' + (error.response?.data?.detail || error.message));
              }
            }}>
              <div className="form-group">
                <label htmlFor="category-name">Category Name:</label>
                <input
                  id="category-name"
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  required
                  placeholder="Enter category name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="category-description">Description:</label>
                <textarea
                  id="category-description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Enter category description"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Test Modal */}
      {showAddTestModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>➕ Add New Test</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const testData = {
                  name: newTest.name,
                  description: newTest.description
                };
                await labFeesAPI.createTest(testData, selectedCategory.id);
                await fetchCategoriesForLab(selectedLab.id); // Refresh the categories and tests
                setShowAddTestModal(false);
                setNewTest({ name: '', description: '', category: '', pricing: [] });
                setCurrentTestPricing([]);
                alert('Test created successfully!');
              } catch (error) {
                alert('Error creating test: ' + (error.response?.data?.detail || error.message));
              }
            }}>
              <div className="form-group">
                <label htmlFor="test-name">Test Name:</label>
                <input
                  id="test-name"
                  type="text"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  required
                  placeholder="Enter test name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="test-description">Description:</label>
                <textarea
                  id="test-description"
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  placeholder="Enter test description"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label htmlFor="test-category">Category:</label>
                <input
                  id="test-category"
                  type="text"
                  value={newTest.category}
                  readOnly
                  className="readonly-input"
                />
              </div>
              
              {/* Pricing Section */}
              <div className="form-group">
                <label>Pricing (Turnaround Times & Prices):</label>
                <div className="pricing-inputs">
                  {currentTestPricing.map((pricing, index) => (
                    <div key={index} className="pricing-row-input">
                      <input
                        type="text"
                        placeholder="Turnaround Time (e.g., 24 hr, 48 hr)"
                        value={pricing.turn_time}
                        onChange={(e) => {
                          const newPricing = [...currentTestPricing];
                          newPricing[index].turn_time = e.target.value;
                          setCurrentTestPricing(newPricing);
                        }}
                        className="turn-time-input"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={pricing.price}
                        onChange={(e) => {
                          const newPricing = [...currentTestPricing];
                          newPricing[index].price = parseFloat(e.target.value) || 0;
                          setCurrentTestPricing(newPricing);
                        }}
                        className="price-input"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newPricing = currentTestPricing.filter((_, i) => i !== index);
                          setCurrentTestPricing(newPricing);
                        }}
                        className="remove-pricing-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentTestPricing([...currentTestPricing, { turn_time: '', price: 0 }])}
                    className="add-pricing-btn"
                  >
                    ➕ Add Pricing
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddTestModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="lab-tests-footer">
        <p>💡 Need help choosing the right test? Contact our lab team for assistance.</p>
      </footer>
    </div>
  );
};

export default LabTests;
