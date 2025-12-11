import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { labFeesAPI } from '../services/api';
import ProjectHeader from './ProjectHeader';
import './LabTests.css';

const LabTests = () => {
  const navigate = useNavigate();
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
  const [projectName, setProjectName] = useState('');
  
  // Staff assignments state
  const [laborRates, setLaborRates] = useState([]);
  const [staffRows, setStaffRows] = useState([{ role: '', count: 1, hours_per_person: 0 }]);
  const [showStaffSection, setShowStaffSection] = useState(false);
  const [hrsEstimationId, setHrsEstimationId] = useState(null);

  // Load project name from localStorage on mount
  useEffect(() => {
    const savedProjectName = localStorage.getItem('currentProjectName');
    if (savedProjectName) {
      setProjectName(savedProjectName);
    }
  }, []);

  // Save project name to localStorage when it changes
  useEffect(() => {
    if (projectName) {
      localStorage.setItem('currentProjectName', projectName);
    }
  }, [projectName]);

  useEffect(() => {
    fetchLabs();
    fetchLaborRates();
  }, []);

  // Fetch labor rates
  const fetchLaborRates = async () => {
    try {
      const rates = await labFeesAPI.getLaborRates();
      setLaborRates(rates);
    } catch (err) {
      console.error('Error fetching labor rates:', err);
    }
  };

  // Listen for HRS estimation completion
  useEffect(() => {
    const handleHrsEstimationComplete = (event) => {
      console.log('HRS Estimation completed:', event.detail);
      if (event.detail?.estimationId) {
        setHrsEstimationId(event.detail.estimationId);
        setShowStaffSection(true); // Show staff section when HRS estimation is done
      }
      if (selectedLab) {
        fetchCategoriesForLab(selectedLab.id);
      }
    };
    
    window.addEventListener('hrs-estimation-complete', handleHrsEstimationComplete);
    
    return () => {
      window.removeEventListener('hrs-estimation-complete', handleHrsEstimationComplete);
    };
  }, [selectedLab]);


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
                  hours: rate.turn_time.hours,
                  sample_count: rate.sample_count || null // Preserve sample_count from API
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

  // Calculate totals from sample_count across all categories and tests
  const calculateOrderSummary = () => {
    let totalSamples = 0;
    let totalCost = 0;
    const breakdown = [];

    if (categories && categories.length > 0) {
      categories.forEach(category => {
        if (category.tests && category.tests.length > 0) {
          category.tests.forEach(test => {
            if (test.rates && test.rates.length > 0) {
              test.rates.forEach(rate => {
                const sampleCount = rate.sample_count || 0;
                if (sampleCount > 0) {
                  const turnTimeStr = typeof rate.turn_time === 'string' ? rate.turn_time : rate.turn_time?.label || 'unknown';
                  const rateCost = sampleCount * (rate.price || 0);
                  
                  totalSamples += sampleCount;
                  totalCost += rateCost;
                  
                  breakdown.push({
                    categoryName: category.name,
                    testName: test.name,
                    turnTime: turnTimeStr,
                    sampleCount: sampleCount,
                    price: rate.price || 0,
                    cost: rateCost
                  });
                }
              });
            }
          });
        }
      });
    }

    return { totalSamples, totalCost, breakdown };
  };

  const getQuantityForTurnaround = (testName, turnTime) => {
    // Ensure turnTime is a string
    const turnTimeStr = typeof turnTime === 'string' ? turnTime : turnTime?.label || 'unknown';
    const key = `${testName}-${turnTimeStr}`;
    return quantities[key] || 0;
  };

  // Staff management functions
  const handleAddStaffRow = () => {
    setStaffRows([...staffRows, { role: '', count: 1, hours_per_person: 0 }]);
  };

  const handleRemoveStaffRow = (index) => {
    const newRows = staffRows.filter((_, i) => i !== index);
    setStaffRows(newRows.length > 0 ? newRows : [{ role: '', count: 1, hours_per_person: 0 }]);
  };

  const handleStaffRoleChange = (index, role) => {
    const newRows = [...staffRows];
    newRows[index].role = role;
    setStaffRows(newRows);
  };

  const handleStaffCountChange = (index, count) => {
    const newRows = [...staffRows];
    newRows[index].count = Math.max(1, parseInt(count) || 1);
    setStaffRows(newRows);
  };

  const handleStaffHoursChange = (index, hours) => {
    const newRows = [...staffRows];
    newRows[index].hours_per_person = Math.max(0, parseFloat(hours) || 0);
    setStaffRows(newRows);
  };

  const getRoleRate = (role) => {
    const rateEntry = laborRates.find(r => r.labor_role === role);
    return rateEntry ? rateEntry.hourly_rate : null;
  };

  // Calculate staff labor costs
  const calculateStaffCosts = () => {
    let totalCost = 0;
    const breakdown = [];

    staffRows.forEach((row) => {
      if (row.role && row.count > 0 && row.hours_per_person > 0) {
        const rate = getRoleRate(row.role);
        if (rate) {
          const totalHours = row.count * row.hours_per_person;
          const cost = totalHours * rate;
          totalCost += cost;
          breakdown.push({
            role: row.role,
            count: row.count,
            hours_per_person: row.hours_per_person,
            total_hours: totalHours,
            hourly_rate: rate,
            cost: cost
          });
        }
      }
    });

    return { totalCost, breakdown };
  };

  // Save order with staff assignments
  const handleSaveOrder = async () => {
    try {
      calculateOrderSummary(); // Calculate to get order details
      calculateStaffCosts(); // Calculate to get staff costs

      // Build order details from sample_count
      const orderDetails = {};
      categories.forEach(category => {
        if (category.tests) {
          category.tests.forEach(test => {
            if (test.rates) {
              test.rates.forEach(rate => {
                if (rate.sample_count > 0) {
                  const testId = test.id.toString();
                  const turnTimeId = rate.turn_time_id?.toString() || '';
                  
                  if (!orderDetails[testId]) {
                    orderDetails[testId] = {};
                  }
                  orderDetails[testId][turnTimeId] = rate.sample_count;
                }
              });
            }
          });
        }
      });

      // Build staff assignments
      const staffAssignments = staffRows
        .filter(row => row.role && row.count > 0 && row.hours_per_person > 0)
        .map(row => ({
          role: row.role,
          count: row.count,
          hours_per_person: row.hours_per_person
        }));

      const orderData = {
        project_name: projectName || null,
        hrs_estimation_id: hrsEstimationId,
        order_details: orderDetails,
        staff_assignments: staffAssignments
      };

      const result = await labFeesAPI.createOrder(orderData);
      alert(`Order saved successfully! Order ID: ${result.id}\nTotal Cost: $${result.total_cost.toFixed(2)}`);
    } catch (error) {
      alert('Error saving order: ' + (error.response?.data?.detail || error.message));
    }
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

      {/* Project Header with Navigation */}
      <ProjectHeader projectName={projectName} moduleName="lab" />

      {/* Project Name Input */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 20px', padding: '0 20px' }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <label htmlFor="lab-project-name" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2c3e50' }}>
            Project Name
          </label>
          <input
            id="lab-project-name"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name (e.g., 'One Sample')"
            style={{
              width: '100%',
              padding: '10px 15px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          <small style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', display: 'block' }}>
            This project name will be shared across all modules
          </small>
        </div>
      </div>

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
                              <span className="turn-time-label">{turnTimeStr}</span>
                              {rate.sample_count && rate.sample_count > 0 && (
                                <span className="rate-sample-count">
                                  • Samples: {rate.sample_count.toLocaleString('en-US')}
                                </span>
                              )}
                            </div>
                            <div className="price-container">
                              <div className="price">{formatPrice(rate.price)}</div>
                              {rate.sample_count && rate.sample_count > 0 ? (
                                <div className="rate-total-cost">
                                  ${(rate.sample_count * rate.price).toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  })}
                                </div>
                              ) : (
                                <div className="rate-total-cost">$0.00</div>
                              )}
                            </div>
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

      {/* Field Collection Staff Section */}
      {(() => {
        const { totalSamples } = calculateOrderSummary();
        return (showStaffSection || staffRows.some(row => row.role) || totalSamples > 0);
      })() && (
        <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#2c3e50', margin: 0 }}>👥 Field Collection Staff</h3>
              <button
                onClick={() => setShowStaffSection(!showStaffSection)}
                style={{
                  padding: '8px 16px',
                  background: showStaffSection ? '#e74c3c' : '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                {showStaffSection ? '▼ Hide' : '▶ Show'} Staff Section
              </button>
            </div>
            
            {showStaffSection && (
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                  Assign staff roles and hours for collecting the samples. This will calculate labor costs for field collection.
                </p>
                
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr auto', gap: '15px', marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem', color: '#2c3e50' }}>
                    <div>Role</div>
                    <div>Count</div>
                    <div>Hours per Person</div>
                    <div>Hourly Rate</div>
                    <div></div>
                  </div>
                  
                  {staffRows.map((row, index) => {
                    const rate = getRoleRate(row.role);
                    const totalHours = row.count * row.hours_per_person;
                    const totalCost = rate ? totalHours * rate : 0;
                    
                    return (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr auto', gap: '15px', padding: '15px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', marginBottom: '10px', alignItems: 'center' }}>
                        <select
                          value={row.role}
                          onChange={(e) => handleStaffRoleChange(index, e.target.value)}
                          style={{
                            padding: '10px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '6px',
                            fontSize: '0.95rem'
                          }}
                        >
                          <option value="">-- Select Role --</option>
                          {laborRates.map((rateEntry) => (
                            <option key={rateEntry.labor_role} value={rateEntry.labor_role}>
                              {rateEntry.labor_role} (${rateEntry.hourly_rate.toFixed(2)}/hr)
                            </option>
                          ))}
                        </select>
                        
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.count}
                          onChange={(e) => handleStaffCountChange(index, e.target.value)}
                          style={{
                            padding: '10px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '6px',
                            fontSize: '0.95rem'
                          }}
                          placeholder="1"
                        />
                        
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          value={row.hours_per_person}
                          onChange={(e) => handleStaffHoursChange(index, e.target.value)}
                          style={{
                            padding: '10px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '6px',
                            fontSize: '0.95rem'
                          }}
                          placeholder="0"
                        />
                        
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                          {rate ? `$${rate.toFixed(2)}/hr` : 'N/A'}
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveStaffRow(index)}
                          disabled={staffRows.length === 1}
                          style={{
                            padding: '8px 12px',
                            background: staffRows.length === 1 ? '#ccc' : '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: staffRows.length === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                          }}
                        >
                          ✕
                        </button>
                        
                        {row.role && row.count > 0 && row.hours_per_person > 0 && rate && (
                          <div style={{ gridColumn: '1 / -1', padding: '10px', background: '#e8f5e9', borderRadius: '6px', marginTop: '10px', fontSize: '0.9rem', color: '#2e7d32' }}>
                            <strong>Total for {row.role}:</strong> {row.count} person{row.count !== 1 ? 's' : ''} × {row.hours_per_person} hours = {totalHours.toFixed(2)} hours × ${rate.toFixed(2)}/hr = <strong>${totalCost.toFixed(2)}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={handleAddStaffRow}
                    style={{
                      padding: '12px 20px',
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      marginTop: '10px'
                    }}
                  >
                    ➕ Add Staff Row
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Summary - Based on sample_count */}
      {(() => {
        const { totalSamples, totalCost, breakdown } = calculateOrderSummary();
        const { totalCost: staffCost, breakdown: staffBreakdown } = calculateStaffCosts();
        const grandTotal = totalCost + staffCost;
        
        if (totalSamples > 0 || totalCost > 0 || staffCost > 0) {
          return (
            <div className="order-summary-container">
              <div className="order-summary-card">
                <h3>🧾 Order Summary</h3>
                <div className="order-summary-details">
                  {/* Breakdown by test and turnaround time */}
                  {breakdown.length > 0 && (
                    <div className="order-summary-breakdown">
                      <h4 className="breakdown-title">Breakdown by Test:</h4>
                      {breakdown.map((item, index) => (
                        <div key={index} className="breakdown-item">
                          <div className="breakdown-test-info">
                            <span className="breakdown-test-name">{item.testName}</span>
                            <span className="breakdown-turn-time">({item.turnTime})</span>
                          </div>
                          <div className="breakdown-values">
                            <span className="breakdown-samples">
                              {item.sampleCount.toLocaleString('en-US')} samples
                            </span>
                            <span className="breakdown-cost">
                              ${item.cost.toLocaleString('en-US', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Staff Labor Costs */}
                  {staffCost > 0 && staffBreakdown.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
                      <h4 className="breakdown-title">Field Collection Labor Costs:</h4>
                      {staffBreakdown.map((item, index) => (
                        <div key={index} className="breakdown-item" style={{ marginBottom: '8px' }}>
                          <div>
                            <strong>{item.role}</strong> - {item.count} person{item.count !== 1 ? 's' : ''} × {item.hours_per_person} hours = {item.total_hours.toFixed(2)} hours
                          </div>
                          <div style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                            ${item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                      <div className="breakdown-item highlight" style={{ marginTop: '10px' }}>
                        <span>Total Field Collection Labor Cost:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                          ${staffCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Totals */}
                  <div className="order-summary-totals">
                    <div className="order-summary-item">
                      <span className="order-summary-label">Total Samples:</span>
                      <span className="order-summary-value">
                        {totalSamples.toLocaleString('en-US')}
                      </span>
                    </div>
                    <div className="order-summary-item">
                      <span className="order-summary-label">Lab Fees Cost:</span>
                      <span className="order-summary-value">
                        ${totalCost.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </span>
                    </div>
                    {staffCost > 0 && (
                      <div className="order-summary-item">
                        <span className="order-summary-label">Field Collection Labor Cost:</span>
                        <span className="order-summary-value">
                          ${staffCost.toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </span>
                      </div>
                    )}
                    <div className="order-summary-item highlight">
                      <span className="order-summary-label">Grand Total:</span>
                      <span className="order-summary-value order-summary-total">
                        ${grandTotal.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Save Order Button */}
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0', textAlign: 'center' }}>
                    <button
                      onClick={handleSaveOrder}
                      style={{
                        padding: '12px 30px',
                        background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
                        marginRight: '10px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 16px rgba(39, 174, 96, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.3)';
                      }}
                    >
                      💾 Save Order
                    </button>
                  </div>
                  
                  {/* Add Labor Button */}
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        navigate('/hrs-estimator', {
                          state: { projectName: projectName }
                        });
                      }}
                      style={{
                        padding: '12px 30px',
                        background: 'linear-gradient(135deg, #3498db, #2980b9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 16px rgba(52, 152, 219, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
                      }}
                    >
                      ➕ Add Labor Estimation
                    </button>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px' }}>
                      Estimate field hours and labor costs for these samples
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

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
