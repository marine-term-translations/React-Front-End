import React from "react";
import { Card, Row, Col } from "react-bootstrap";
import BranchChart from "./BranchChart";

const BranchCard = ({
  branch,
  formattedDate,
  emptyFieldCounts,
  totalFields,
}) => (
  <Col key={branch.name} xxl={4} xl={4} lg={6} md={6} sm={12}>
    <Card
      as="a"
      href={`?branch=${branch.name}#/translate`}
      style={{ cursor: "pointer" }}
    >
      <Card.Body>
        <Row>
          <Col md={6}>
            <Card.Title>
              <strong>{branch.name}</strong>
            </Card.Title>
            <Card.Subtitle className="mb-2 text-muted">
              {formattedDate}
            </Card.Subtitle>
          </Col>
          <Col md={6}>
            <BranchChart
              emptyFieldCounts={emptyFieldCounts}
              totalFields={totalFields}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  </Col>
);

export default BranchCard;
