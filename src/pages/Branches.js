import React from "react";
import PropTypes from "prop-types";
import { Container, Row, Alert } from "react-bootstrap";
import Loader from "../components/Loader";
import BranchCard from "../components/BranchCard";
import { formatDate } from "../utils/dateUtils";
import useBranches from "../hooks/useBranches";

/**
 * Branches page component to display branch information.
 */
const Branches = () => {
  const { error, loading, branches, emptyField, totalFieldsCount } =
    useBranches();

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Container className="d-flex flex-column align-items-center">
      {loading ? (
        <Loader />
      ) : error ? (
        <Alert variant="danger">
          <p>{error}</p>
        </Alert>
      ) : (
        <Row className="g-4">
          {branches.map((branch) => {
            const formattedDate = formatDate(branch.lastCommit, userTimeZone);
            const emptyFieldCounts = emptyField[branch.name];
            const totalFields = totalFieldsCount[branch.name];
            return (
              <BranchCard
                key={branch.name}
                branch={branch}
                formattedDate={formattedDate}
                emptyFieldCounts={emptyFieldCounts}
                totalFields={totalFields}
              />
            );
          })}
        </Row>
      )}
    </Container>
  );
};

Branches.propTypes = {
  error: PropTypes.string,
  loading: PropTypes.bool,
  branches: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      lastCommit: PropTypes.string.isRequired,
    })
  ),
  emptyField: PropTypes.object,
  totalFieldsCount: PropTypes.object,
};

export default Branches;
