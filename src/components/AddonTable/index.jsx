import './AddonTable.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import BootstrapTable from 'react-bootstrap-table-next';

function AddonTable(props) {
  const {
    addons,
    columns,
    keyField,
    selectRow,
    noTableData,
    sort,
  } = props;
  return (
    <div id="AddonTable">
      {selectRow
        ? (
          <BootstrapTable
            keyField={keyField}
            data={addons}
            columns={columns}
            selectRow={selectRow}
            headerClasses="addon-table-header"
            rowClasses="addon-table-row"
            noDataIndication={noTableData}
            sort={sort}
          />
        )
        : (
          <BootstrapTable
            keyField={keyField}
            data={addons}
            columns={columns}
            headerClasses="addon-table-header"
            rowClasses="addon-table-row"
            noDataIndication={noTableData}
            sort={sort}
          />
        )}
    </div>
  );
}

AddonTable.propTypes = {
  addons: PropTypes.array,
  columns: PropTypes.array,
  selectRow: PropTypes.object,
  sort: PropTypes.object,
  keyField: PropTypes.string.isRequired,
  noTableData: PropTypes.func.isRequired,
};

AddonTable.defaultProps = {
  addons: [],
  columns: [],
  selectRow: null,
  sort: {},
};

export default AddonTable;
