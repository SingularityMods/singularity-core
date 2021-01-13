import './AddonScreenshotsTab.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';

function AddonScreenshotsTab(props) {
  const { screenshots } = props;
  return (
    <Row>
      <Col xs={12} className="addon-screenshots-pane">
        {screenshots && screenshots.map((screenshot) => (
          <img key={screenshot.id} alt="Addon screenshot" className="addon-screenshot" src={screenshot.url} />
        ))}
      </Col>
    </Row>
  );
}

AddonScreenshotsTab.propTypes = {
  screenshots: PropTypes.array,
};

AddonScreenshotsTab.defaultProps = {
  screenshots: [],
};

export default AddonScreenshotsTab;
