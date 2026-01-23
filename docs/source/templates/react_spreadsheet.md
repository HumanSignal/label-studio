---
title: Spreadsheet Editor
type: templates
category: Programmable Interfaces
order: 750
is_new: t
meta_title: Template for spreadsheet editing
meta_description: Template that uses a custom UI to edit a spreadsheet and then output any changes. 
---


This template creates a custom spreadsheet editor built with `ReactCode` and allows users to view, edit, and manage product data in a table format. 

The labeling interface provides a full-featured spreadsheet experience with capabilities that include:

* Adding and deleting rows and columns
* Filtering data across all columns or by specific columns
* Resizing column widths
* Reordering columns by dragging
* Editing individual cells

![Screenshot](/images/templates-misc/react-spreadsheet.png)

!!! error Enterprise
    This template and the `ReactCode` tag can only be used in Label Studio Enterprise.

    For more information, including simplified code examples, see [ReactCode](/tags/reactcode).

## Labeling configuration

This labeling configuration creates a spreadsheet editor that tracks and exports only the changes made to the original data, rather than saving the entire spreadsheet state. 

The `ReactCode` follows a **change-tracking pattern** where:
1. Original data is stored separately and never modified
2. Changes (edits, additions, deletions) are tracked in a dedicated `changes` object
3. Current view is computed by applying changes to the original data
4. Exported region contains only the changes, not the full dataset


{% details <b>Click to expand</b> %}

```xml
<View>
  <ReactCode name="spreadsheet_editor" toName="spreadsheet_editor" data="$attributes_data">
<![CDATA[
({ React, data, regions, addRegion }) => {
  // Parse the data structure
  const [spreadsheetData, setSpreadsheetData] = React.useState([]);
  const [originalRows, setOriginalRows] = React.useState([]); // Store original data for comparison
  const [columns, setColumns] = React.useState([]);
  const [originalColumns, setOriginalColumns] = React.useState([]);
  const [newColumnName, setNewColumnName] = React.useState('');
  const [filterText, setFilterText] = React.useState('');
  const [columnFilters, setColumnFilters] = React.useState({});
  const [columnWidths, setColumnWidths] = React.useState({});
  const [draggedColumn, setDraggedColumn] = React.useState(null);
  const [editingCell, setEditingCell] = React.useState(null);
  const [resizingColumn, setResizingColumn] = React.useState(null);
  const [resizeStartX, setResizeStartX] = React.useState(0);
  const [resizeStartWidth, setResizeStartWidth] = React.useState(0);

  // Track changes separately - only this will be saved to regions
  const [changes, setChanges] = React.useState({
    cellEdits: [],      // Array of {rowIndex, column, oldValue, newValue, productId}
    addedRows: [],      // Array of new row objects with temporary IDs
    deletedRows: [],    // Array of {productId, rowData} for deleted rows
    addedColumns: [],   // Array of new column names
    deletedColumns: []  // Array of deleted column names
  });

  const defaultState = {
    changes: {
      cellEdits: [],
      addedRows: [],
      deletedRows: [],
      addedColumns: [],
      deletedColumns: []
    }
  };

  const state = regions[0]?.value ?? defaultState;
  
  // Initialize changes from existing region if present
  React.useEffect(() => {
    if (regions[0]?.value?.changes) {
      setChanges(regions[0].value.changes);
    }
  }, [regions]);

  // Helper function to extract data from nested structure
  const extractRows = (data) => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Handle the nested structure: [{ data: { attributes_data: [...] } }]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstItem = parsed[0];
        if (firstItem.data && Array.isArray(firstItem.data.attributes_data)) {
          return firstItem.data.attributes_data;
        }
      }
      
      // Handle direct array of rows
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      // Handle object with attributes_data
      if (parsed && Array.isArray(parsed.attributes_data)) {
        return parsed.attributes_data;
      }
      
      // Handle object with data.attributes_data
      if (parsed && parsed.data && Array.isArray(parsed.data.attributes_data)) {
        return parsed.data.attributes_data;
      }
      
      return [];
    } catch (e) {
      console.error('Error parsing data:', e);
      return [];
    }
  };

  // Initialize data and columns
  React.useEffect(() => {
    const rows = extractRows(data);
    
    if (rows.length > 0) {
      setSpreadsheetData(rows);
      // Store original rows for comparison (only on first load)
      if (originalRows.length === 0) {
        setOriginalRows(JSON.parse(JSON.stringify(rows))); // Deep copy
      }
      
      // Extract all unique column names from all rows (including all_attributes)
      const allColumns = new Set();
      rows.forEach(row => {
        Object.keys(row).forEach(key => {
          allColumns.add(key); // Include all_attributes now
        });
      });
      
      const columnList = Array.from(allColumns);
      
      // Default columns if none exist
      const defaultColumns = [
        'product_id',
        'name',
        'norm_value',
        'current_value',
        'has_change',
        'rationales',
        'link',
        'all_attributes'
      ];
      
      // Merge default columns with found columns, ensuring all_attributes is included
      const mergedColumns = [...new Set([...defaultColumns, ...columnList])];
      setColumns(mergedColumns);
      setOriginalColumns(mergedColumns); // Track original columns
      
      // Initialize default column widths
      const defaultWidths = {
        'product_id': 120,
        'name': 200,
        'norm_value': 150,
        'current_value': 150,
        'has_change': 100,
        'rationales': 300,
        'link': 200,
        'all_attributes': 300
      };
      
      // Initialize region if it doesn't exist - only save empty changes object
      if (!regions[0]) {
        addRegion({
          changes: {
            cellEdits: [],
            addedRows: [],
            deletedRows: [],
            addedColumns: [],
            deletedColumns: []
          }
        });
        setColumnWidths(defaultWidths);
      } else {
        // Restore changes from existing region
        const existingState = regions[0].value || {};
        if (existingState.changes) {
          setChanges(existingState.changes);
        }
        const origCols = existingState.originalColumns || mergedColumns;
        const existingWidths = existingState.columnWidths || {};
        const mergedWidths = { ...defaultWidths, ...existingWidths };
        setOriginalColumns(origCols);
        setColumnWidths(mergedWidths);
        setColumnFilters(existingState.columnFilters || {});
      }
    } else {
      // Initialize with empty state
      const defaultCols = ['product_id', 'name', 'norm_value', 'current_value', 'has_change', 'rationales', 'link', 'all_attributes'];
      const defaultWidths = {
        'product_id': 120,
        'name': 200,
        'norm_value': 150,
        'current_value': 150,
        'has_change': 100,
        'rationales': 300,
        'link': 200,
        'all_attributes': 300
      };
      setColumns(defaultCols);
      setOriginalColumns(defaultCols);
      setSpreadsheetData([]);
      setColumnWidths(defaultWidths);
      
      if (!regions[0]) {
        addRegion({
          changes: {
            cellEdits: [],
            addedRows: [],
            deletedRows: [],
            addedColumns: [],
            deletedColumns: []
          }
        });
      }
    }
  }, [data]);

  // Get current rows by applying changes to original rows
  const currentRows = React.useMemo(() => {
    let rows = [...originalRows];
    
    // Remove deleted rows first
    const deletedProductIds = new Set(changes.deletedRows.map(d => d.productId));
    rows = rows.filter(row => !deletedProductIds.has(row.product_id));
    
    // Add new rows first
    rows = [...rows, ...changes.addedRows];
    
    // Apply cell edits (using product_id or _tempId to find the row)
    changes.cellEdits.forEach(edit => {
      const rowIndex = rows.findIndex(r => 
        (r.product_id && r.product_id === edit.productId) || 
        (r._tempId && r._tempId === edit.productId)
      );
      if (rowIndex >= 0) {
        rows[rowIndex] = { ...rows[rowIndex], [edit.column]: edit.newValue };
      }
    });
    
    return rows;
  }, [originalRows, changes]);
  
  const currentColumns = state.columns && state.columns.length > 0 ? state.columns : columns;
  const currentOriginalColumns = state.originalColumns && state.originalColumns.length > 0 ? state.originalColumns : originalColumns;
  const currentColumnWidths = state.columnWidths || columnWidths;
  const currentColumnFilters = state.columnFilters || columnFilters;
  
  // Helper function to save only changes to region
  const saveChanges = (updatedChanges) => {
    const changesToSave = {
      changes: updatedChanges
    };
    
    if (regions[0]) {
      regions[0].update(changesToSave);
    } else {
      addRegion(changesToSave);
    }
    setChanges(updatedChanges);
  };

  // Filter rows based on filter text and column-specific filters
  const filteredRows = React.useMemo(() => {
    let filtered = currentRows;
    
    // Apply global filter if present
    if (filterText.trim()) {
      const searchText = filterText.toLowerCase();
      filtered = filtered.filter(row => {
        return currentColumns.some(col => {
          const value = row[col];
          if (value === null || value === undefined) return false;
          const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          return valueStr.toLowerCase().includes(searchText);
        });
      });
    }
    
    // Apply column-specific filters
    const activeColumnFilters = Object.entries(currentColumnFilters).filter(([_, filterValue]) => filterValue && filterValue.trim());
    if (activeColumnFilters.length > 0) {
      filtered = filtered.filter(row => {
        return activeColumnFilters.every(([colName, filterValue]) => {
          const value = row[colName];
          if (value === null || value === undefined) return false;
          const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          return valueStr.toLowerCase().includes(filterValue.toLowerCase());
        });
      });
    }
    
    return filtered;
  }, [currentRows, filterText, currentColumns, currentColumnFilters]);

  // Add new row
  const addRow = () => {
    const newRow = {};
    currentColumns.forEach(col => {
      newRow[col] = '';
    });
    // Add temporary ID for tracking
    newRow._tempId = `temp_${Date.now()}_${Math.random()}`;
    
    const updatedChanges = {
      ...changes,
      addedRows: [...changes.addedRows, newRow]
    };
    
    saveChanges(updatedChanges);
    setSpreadsheetData([...currentRows, newRow]);
  };

  // Delete row
  const deleteRow = (rowIndex) => {
    const rowToDelete = currentRows[rowIndex];
    
    // Check if it's a newly added row (has temp ID)
    if (rowToDelete._tempId) {
      // Remove from addedRows
      const updatedChanges = {
        ...changes,
        addedRows: changes.addedRows.filter(r => r._tempId !== rowToDelete._tempId)
      };
      saveChanges(updatedChanges);
    } else {
      // It's an original row - add to deletedRows
      const updatedChanges = {
        ...changes,
        deletedRows: [...changes.deletedRows, {
          productId: rowToDelete.product_id,
          rowData: { ...rowToDelete }
        }]
      };
      saveChanges(updatedChanges);
    }
    
    const newRows = currentRows.filter((_, idx) => idx !== rowIndex);
    setSpreadsheetData(newRows);
  };

  // Add new column
  const addColumn = () => {
    if (!newColumnName.trim()) {
      alert('Please enter a column name');
      return;
    }
    
    if (currentColumns.includes(newColumnName.trim())) {
      alert('Column already exists');
      return;
    }
    
    const newCols = [...currentColumns, newColumnName.trim()];
    
    // Add empty value for this column to all existing rows
    const newRows = currentRows.map(row => ({
      ...row,
      [newColumnName.trim()]: ''
    }));
    
    // Add default width for new column
    const newWidths = { ...currentColumnWidths, [newColumnName.trim()]: 150 };
    
    // Track new column addition
    const updatedChanges = {
      ...changes,
      addedColumns: [...changes.addedColumns, newColumnName.trim()]
    };
    saveChanges(updatedChanges);
    
    setColumns(newCols);
    setColumnWidths(newWidths);
    setSpreadsheetData(newRows);
    setNewColumnName('');
  };

  // Delete column (only for new columns)
  const deleteColumn = (colName) => {
    // Check if it's an original column
    if (currentOriginalColumns.includes(colName)) {
      alert('Cannot delete original columns. Only newly added columns can be deleted.');
      return;
    }
    
    if (currentColumns.length <= 1) {
      alert('Cannot delete the last column');
      return;
    }
    
    const newCols = currentColumns.filter(col => col !== colName);
    const newRows = currentRows.map(row => {
      const newRow = { ...row };
      delete newRow[colName];
      return newRow;
    });
    
    // Remove width and filter for deleted column
    const newWidths = { ...currentColumnWidths };
    delete newWidths[colName];
    const newFilters = { ...currentColumnFilters };
    delete newFilters[colName];
    
    // Track column deletion
    const updatedChanges = {
      ...changes,
      deletedColumns: [...changes.deletedColumns, colName],
      // Also remove any cell edits for this column
      cellEdits: changes.cellEdits.filter(e => e.column !== colName)
    };
    saveChanges(updatedChanges);
    
    setColumns(newCols);
    setColumnWidths(newWidths);
    setColumnFilters(newFilters);
    setSpreadsheetData(newRows);
  };

  // Update cell value
  const updateCell = (rowIndex, colName, value) => {
    const row = currentRows[rowIndex];
    const oldValue = row[colName];
    const rowId = row.product_id || row._tempId;
    
    // Find original value for this cell
    let originalValue = oldValue;
    if (row.product_id && !row._tempId) {
      // It's an original row - find it in originalRows
      const originalRow = originalRows.find(r => r.product_id === row.product_id);
      if (originalRow) {
        originalValue = originalRow[colName];
      }
    }
    
    // Check if this is actually a change from original
    const isNewRow = row._tempId !== undefined;
    const isActualChange = !isNewRow && JSON.stringify(originalValue) !== JSON.stringify(value);
    
    if (isNewRow || isActualChange) {
      // Check if we already have an edit for this cell (using productId/tempId)
      const existingEditIndex = changes.cellEdits.findIndex(
        e => e.productId === rowId && e.column === colName
      );
      
      let updatedEdits = [...changes.cellEdits];
      if (existingEditIndex >= 0) {
        // Update existing edit
        updatedEdits[existingEditIndex] = {
          ...updatedEdits[existingEditIndex],
          newValue: value
        };
      } else {
        // Add new edit
        updatedEdits.push({
          column: colName,
          oldValue: isNewRow ? oldValue : originalValue,
          newValue: value,
          productId: rowId
        });
      }
      
      const updatedChanges = {
        ...changes,
        cellEdits: updatedEdits
      };
      
      saveChanges(updatedChanges);
    }
    
    const newRows = [...currentRows];
    if (!newRows[rowIndex]) {
      newRows[rowIndex] = {};
    }
    newRows[rowIndex] = { ...newRows[rowIndex], [colName]: value };
    setSpreadsheetData(newRows);
  };

  // Handle column reordering
  const handleColumnDragStart = (colIndex) => {
    setDraggedColumn(colIndex);
  };

  const handleColumnDragOver = (e, colIndex) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === colIndex) return;
    
    const newColumns = [...currentColumns];
    const draggedCol = newColumns[draggedColumn];
    newColumns.splice(draggedColumn, 1);
    newColumns.splice(colIndex, 0, draggedCol);
    
    setColumns(newColumns);
    setDraggedColumn(colIndex);
  };

  const handleColumnDragEnd = () => {
    // Column reordering is UI-only, doesn't need to be saved as a change
    setDraggedColumn(null);
  };

  // Handle column width resizing
  const handleResizeStart = (e, colName) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(colName);
    setResizeStartX(e.clientX);
    setResizeStartWidth(currentColumnWidths[colName] || 150);
  };

  React.useEffect(() => {
    if (!resizingColumn) return;

    const handleResize = (e) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(50, resizeStartWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
    };

    const handleResizeEnd = () => {
      // Column width resizing is UI-only, doesn't need to be saved as a change
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, state, currentColumnFilters, regions]);

  // Update column filter
  const updateColumnFilter = (colName, filterValue) => {
    // Filtering is UI-only, doesn't need to be saved as a change
    const newFilters = { ...currentColumnFilters, [colName]: filterValue };
    setColumnFilters(newFilters);
  };

  // Handle submit
  const handleSubmit = () => {
    // Final submission - save changes with metadata
    const submission = {
      changes: {
        ...changes,
        submittedAt: new Date().toISOString(),
        submitted: true
      }
    };
    
    if (regions[0]) {
      regions[0].update(submission);
    } else {
      addRegion(submission);
    }
    
    const changeCount = changes.cellEdits.length + changes.addedRows.length + changes.deletedRows.length;
    alert(`Spreadsheet submitted successfully! ${changeCount} change(s) recorded.`);
  };

  // Styles
  const containerStyle = {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '100%',
    overflowX: 'auto'
  };

  const headerStyle = {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  };

  const buttonStyle = {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '10px',
    backgroundColor: '#2196F3',
    color: 'white'
  };

  const addColumnStyle = {
    ...buttonStyle,
    backgroundColor: '#4CAF50'
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f44336',
    padding: '5px 10px',
    fontSize: '12px',
    marginRight: '5px'
  };

  const submitButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#4CAF50',
    fontSize: '16px',
    padding: '12px 24px'
  };

  const tableContainerStyle = {
    overflowX: 'auto',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '20px'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    minWidth: '800px'
  };

  const thStyle = {
    backgroundColor: '#f5f5f5',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    borderRight: '1px solid #ddd',
    fontWeight: 'bold',
    color: '#333',
    position: 'sticky',
    top: 0,
    zIndex: 10
  };

  const tdStyle = {
    padding: '10px',
    borderBottom: '1px solid #eee',
    borderRight: '1px solid #eee',
    fontSize: '14px'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '60px',
    resize: 'vertical',
    fontFamily: 'inherit'
  };

  const addColumnContainerStyle = {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px'
  };

  const columnInputStyle = {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    flex: '1',
    maxWidth: '300px'
  };

  const rowActionsStyle = {
    display: 'flex',
    gap: '5px'
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '40px',
    color: '#999'
  };

  const filterContainerStyle = {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  };

  const filterInputStyle = {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    flex: '1',
    maxWidth: '400px'
  };

  return React.createElement("div", { style: containerStyle },
    // Header
    React.createElement("div", { style: headerStyle },
      React.createElement("h1", { style: titleStyle }, "Spreadsheet Editor"),
      React.createElement("div", {},
        React.createElement("button", {
          onClick: addRow,
          style: buttonStyle
        }, "+ Add Row"),
        React.createElement("button", {
          onClick: handleSubmit,
          style: submitButtonStyle
        }, "Submit")
      )
    ),

    // Filter Section
    currentRows.length > 0 && React.createElement("div", { style: filterContainerStyle },
      React.createElement("label", { style: { fontWeight: 'bold', fontSize: '14px', color: '#555' } }, "Global Filter:"),
      React.createElement("input", {
        type: "text",
        value: filterText,
        onChange: (e) => setFilterText(e.target.value),
        placeholder: "Search across all columns...",
        style: filterInputStyle
      }),
      filterText && React.createElement("button", {
        onClick: () => setFilterText(''),
        style: { ...buttonStyle, backgroundColor: '#999', padding: '10px 15px' }
      }, "Clear")
    ),

    // Add Column Section
    React.createElement("div", { style: addColumnContainerStyle },
      React.createElement("input", {
        type: "text",
        value: newColumnName,
        onChange: (e) => setNewColumnName(e.target.value),
        placeholder: "Enter new column name",
        style: columnInputStyle,
        onKeyPress: (e) => {
          if (e.key === 'Enter') {
            addColumn();
          }
        }
      }),
      React.createElement("button", {
        onClick: addColumn,
        style: addColumnStyle
      }, "+ Add Column")
    ),

    // Spreadsheet Table
    currentRows.length > 0 ? React.createElement("div", { style: tableContainerStyle },
      React.createElement("table", { style: tableStyle },
        // Header Row
        React.createElement("thead", {},
          React.createElement("tr", {},
            React.createElement("th", { style: { ...thStyle, width: '80px' } }, "Actions"),
            currentColumns.map((col, colIdx) =>
              React.createElement("th", { 
                key: colIdx, 
                style: { 
                  ...thStyle, 
                  width: currentColumnWidths[col] || 150,
                  minWidth: currentColumnWidths[col] || 150,
                  maxWidth: currentColumnWidths[col] || 150,
                  position: 'relative',
                  userSelect: 'none',
                  opacity: draggedColumn === colIdx ? 0.5 : 1,
                  backgroundColor: draggedColumn === colIdx ? '#e3f2fd' : thStyle.backgroundColor
                },
                draggable: true,
                onDragStart: () => handleColumnDragStart(colIdx),
                onDragOver: (e) => handleColumnDragOver(e, colIdx),
                onDragEnd: handleColumnDragEnd
              },
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
                  // Column header with drag handle
                  React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '5px', flex: 1, cursor: 'move' } },
                      React.createElement("span", { style: { fontSize: '10px', color: '#999', cursor: 'grab' } }, "⋮⋮"),
                      React.createElement("span", {}, col)
                    ),
                    // Only show delete button for new columns (not original columns)
                    !currentOriginalColumns.includes(col) && React.createElement("button", {
                      onClick: () => deleteColumn(col),
                      style: { ...deleteButtonStyle, padding: '2px 8px', fontSize: '10px' },
                      title: "Delete column"
                    }, "×")
                  ),
                  // Column filter input
                  React.createElement("input", {
                    type: "text",
                    value: currentColumnFilters[col] || '',
                    onChange: (e) => updateColumnFilter(col, e.target.value),
                    placeholder: `Filter ${col}...`,
                    style: {
                      padding: '4px 8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '12px',
                      width: '100%',
                      boxSizing: 'border-box'
                    },
                    onClick: (e) => e.stopPropagation()
                  })
                ),
                // Resize handle
                React.createElement("div", {
                  onMouseDown: (e) => handleResizeStart(e, col),
                  style: {
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '5px',
                    cursor: 'col-resize',
                    backgroundColor: resizingColumn === col ? '#2196F3' : 'transparent',
                    zIndex: 20
                  },
                  title: "Drag to resize column"
                })
              )
            )
          )
        ),
        // Data Rows (using filtered rows)
        React.createElement("tbody", {},
          filteredRows.map((row, filteredIdx) => {
            // Find the actual index in currentRows by matching the row object reference or key fields
            let actualRowIndex = currentRows.findIndex(r => r === row);
            
            // If reference match fails, try matching by key fields
            if (actualRowIndex < 0 && row.product_id && row.name) {
              actualRowIndex = currentRows.findIndex(r => 
                r.product_id === row.product_id && r.name === row.name
              );
            }
            
            // Final fallback: use filtered index (shouldn't happen in normal cases)
            const rowIdx = actualRowIndex >= 0 ? actualRowIndex : filteredIdx;
            
            return React.createElement("tr", { key: filteredIdx },
              // Actions column
              React.createElement("td", { style: tdStyle },
                React.createElement("div", { style: rowActionsStyle },
                  React.createElement("button", {
                    onClick: () => deleteRow(rowIdx),
                    style: deleteButtonStyle,
                    title: "Delete row"
                  }, "Delete")
                )
              ),
              // Data cells
              currentColumns.map((col, colIdx) => {
                let cellValue = row[col];
                // Handle all_attributes field - display as JSON
                if (col === 'all_attributes') {
                  if (cellValue === null || cellValue === undefined) {
                    cellValue = '';
                  } else if (typeof cellValue === 'object') {
                    cellValue = JSON.stringify(cellValue, null, 2);
                  } else {
                    cellValue = String(cellValue);
                  }
                } else {
                  cellValue = cellValue || '';
                }
                const isEditing = editingCell && editingCell.row === rowIdx && editingCell.col === col;
                
                return React.createElement("td", { 
                  key: colIdx, 
                  style: { 
                    ...tdStyle, 
                    width: currentColumnWidths[col] || 150,
                    minWidth: currentColumnWidths[col] || 150,
                    maxWidth: currentColumnWidths[col] || 150
                  } 
                },
                  (col === 'rationales' || col === 'all_attributes') ? (
                    React.createElement("textarea", {
                      value: typeof cellValue === 'object' ? JSON.stringify(cellValue, null, 2) : (cellValue || ''),
                      onChange: (e) => {
                        if (col === 'all_attributes') {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            updateCell(rowIdx, col, parsed);
                          } catch (err) {
                            updateCell(rowIdx, col, e.target.value);
                          }
                        } else {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            updateCell(rowIdx, col, parsed);
                          } catch (err) {
                            updateCell(rowIdx, col, e.target.value);
                          }
                        }
                      },
                      style: textareaStyle,
                      placeholder: "Enter value"
                    })
                  ) : (
                    React.createElement("input", {
                      type: "text",
                      value: cellValue || '',
                      onChange: (e) => updateCell(rowIdx, col, e.target.value),
                      style: inputStyle,
                      placeholder: "Enter value"
                    })
                  )
                );
              })
            );
          })
        )
      )
    ) : React.createElement("div", { style: emptyStateStyle },
      currentRows.length === 0 ? (
        React.createElement(React.Fragment, {},
          React.createElement("p", { style: { fontSize: '18px', marginBottom: '10px' } }, "No data available"),
          React.createElement("p", { style: { fontSize: '14px', color: '#999' } }, "Click 'Add Row' to start adding data")
        )
      ) : (
        React.createElement(React.Fragment, {},
          React.createElement("p", { style: { fontSize: '18px', marginBottom: '10px' } }, "No rows match the filter"),
          React.createElement("p", { style: { fontSize: '14px', color: '#999' } }, `Try adjusting your search. Total rows: ${currentRows.length}`)
        )
      )
    ),

    // Summary
    currentRows.length > 0 && React.createElement("div", { style: { marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '6px' } },
      React.createElement("p", { style: { margin: 0, fontSize: '14px', color: '#666' } },
        filterText ? 
          `Showing ${filteredRows.length} of ${currentRows.length} rows | Total Columns: ${currentColumns.length}` :
          `Total Rows: ${currentRows.length} | Total Columns: ${currentColumns.length}`
      )
    )
  );
}
]]>
  </ReactCode>
</View>
```

{% enddetails %}



## Example input 

Copy this into a JSON file and then import it into a project with the example code above. 

This will create three rows in your spreadsheet editor. 

{% details <b>Click to expand</b> %}

```json
{
"data": {
    "attributes_data": [
      {
        "link": "https://www.example-store.com/products/WM-2024-001",
        "name": "Wireless Connectivity Range",
        "product_id": "WM-2024-001",
        "has_change": false,
        "norm_value": null,
        "rationales": "{\"input_attributes\": [{\"Wireless Connectivity Range\": \"10 meters\"}], \"input_rules\": [\"Wireless Connectivity Range: The maximum distance the device can maintain a stable connection from the receiver.\"], \"other\": \"The input explicitly states the Wireless Connectivity Range as '10 meters'.\"}",
        "current_value": "10 meters",
        "all_attributes": {
          "Item": "Wireless Mouse",
          "Connectivity": "2.4GHz Wireless",
          "Battery Life": "12 months",
          "For Use With": "Desktop, Laptop",
          "Standards": "CE, FCC Certified",
          "Mouse Type": "Optical",
          "Buttons": "3-Button",
          "Body Material": "Plastic",
          "Grip Material": "Rubber",
          "Scroll Wheel": "Yes, with tilt",
          "Operation Type": "Wireless",
          "Overall Height": "1.5 in",
          "Overall Length": "4.2 in",
          "Overall Width": "2.5 in",
          "Weight": "85g",
          "Mounting Orientation": "Right or Left Hand",
          "DPI Range": "800-1600",
          "Connection Type": "USB Receiver",
          "Compatibility": "Windows, macOS, Linux",
          "Wireless Range": "10 meters",
          "Battery Type": "AA",
          "Color": "Black",
          "Package Contents": "Mouse, USB Receiver, Battery",
          "Warranty Period": "2 years",
          "Operating Temperature - Maximum": "40°C",
          "Operating Temperature - Minimum": "0°C",
          "Storage Humidity - Maximum": "85%",
          "Storage Humidity - Minimum": "10%"
        }
      },
      {
        "link": "https://www.example-store.com/products/WM-2024-002",
        "name": "Battery Life Duration",
        "product_id": "WM-2024-002",
        "has_change": false,
        "norm_value": null,
        "rationales": "{\"input_attributes\": [{\"Battery Life Duration\": \"18 months\"}], \"input_rules\": [\"Battery Life Duration: The expected operating time before battery replacement is needed under normal usage.\"], \"other\": \"The input explicitly states the Battery Life Duration as '18 months'.\"}",
        "current_value": "18 months",
        "all_attributes": {
          "Item": "Ergonomic Wireless Mouse",
          "Connectivity": "Bluetooth 5.0",
          "Battery Life": "18 months",
          "For Use With": "Desktop, Laptop, Tablet",
          "Standards": "CE, FCC, RoHS Certified",
          "Mouse Type": "Laser",
          "Buttons": "5-Button",
          "Body Material": "ABS Plastic",
          "Grip Material": "Silicone",
          "Scroll Wheel": "Yes, with horizontal tilt",
          "Operation Type": "Wireless",
          "Overall Height": "1.8 in",
          "Overall Length": "4.8 in",
          "Overall Width": "3.0 in",
          "Weight": "105g",
          "Mounting Orientation": "Right Hand",
          "DPI Range": "1000-3200",
          "Connection Type": "Bluetooth or USB Receiver",
          "Compatibility": "Windows, macOS, Linux, Android",
          "Wireless Range": "15 meters",
          "Battery Type": "Rechargeable Lithium",
          "Color": "Silver",
          "Package Contents": "Mouse, USB-C Cable, USB Receiver, Quick Start Guide",
          "Warranty Period": "3 years",
          "Operating Temperature - Maximum": "45°C",
          "Operating Temperature - Minimum": "-5°C",
          "Storage Humidity - Maximum": "90%",
          "Storage Humidity - Minimum": "5%"
        }
      },
      {
        "link": "https://www.example-store.com/products/WM-2024-003",
        "name": "DPI Sensitivity Setting",
        "product_id": "WM-2024-003",
        "has_change": true,
        "norm_value": "1600",
        "rationales": "{\"input_attributes\": [{\"DPI Sensitivity Setting\": \"2400\"}], \"input_rules\": [\"DPI Sensitivity Setting: The dots per inch sensitivity level for cursor movement precision.\"], \"other\": \"The input shows a DPI setting of '2400', which differs from the normalized value of '1600'.\"}",
        "current_value": "2400",
        "all_attributes": {
          "Item": "Gaming Wireless Mouse",
          "Connectivity": "2.4GHz Wireless + Bluetooth",
          "Battery Life": "6 months",
          "For Use With": "Gaming PC, Laptop",
          "Standards": "CE, FCC Certified",
          "Mouse Type": "Optical Gaming Sensor",
          "Buttons": "6-Button Programmable",
          "Body Material": "Matte Plastic",
          "Grip Material": "Textured Rubber",
          "Scroll Wheel": "Yes, RGB Backlit",
          "Operation Type": "Wireless",
          "Overall Height": "1.6 in",
          "Overall Length": "5.0 in",
          "Overall Width": "2.8 in",
          "Weight": "120g",
          "Mounting Orientation": "Right Hand",
          "DPI Range": "800-4000",
          "Connection Type": "USB Receiver",
          "Compatibility": "Windows, macOS",
          "Wireless Range": "12 meters",
          "Battery Type": "AA",
          "Color": "RGB Customizable",
          "Package Contents": "Mouse, USB Receiver, Battery, Software CD",
          "Warranty Period": "1 year",
          "Operating Temperature - Maximum": "50°C",
          "Operating Temperature - Minimum": "0°C",
          "Storage Humidity - Maximum": "80%",
          "Storage Humidity - Minimum": "10%"
        }
      }
    ]
}
}
```

{% enddetails %}

## Example output

The output only reflects edits made to the spreadsheet. For example, in this annotation the user added values to the previously empty `norm_value` cells:

```json
{
  "result": [
    {
      "id": "eRb3JW4K72",
      "type": "reactcode",
      "value": {
        "reactcode": {
          "changes": {
            "addedRows": [],
            "cellEdits": [
              {
                "column": "norm_value",
                "newValue": "1200",
                "oldValue": null,
                "productId": "WM-2024-001"
              },
              {
                "column": "norm_value",
                "newValue": "1400",
                "oldValue": null,
                "productId": "WM-2024-002"
              }
            ],
            "deletedRows": [],
            "addedColumns": [],
            "deletedColumns": []
          }
        }
      },
      "origin": "manual",
      "to_name": "spreadsheet_editor",
      "from_name": "spreadsheet_editor"
    }
  ]
}
```