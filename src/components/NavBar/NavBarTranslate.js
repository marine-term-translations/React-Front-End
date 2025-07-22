import { useState, useEffect } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './NavBar.css';

const NavBarTranslate = () => {
  const [isBranch, setIsBranch] = useState(false);
  const [pathToHostSite, setPathToHostSite] = useState(null);

  useEffect(() => {
    const branchExists = sessionStorage.getItem('branch');
    if (branchExists) {
      setIsBranch(true);
    }
    setPathToHostSite(`${window.location.protocol}//${window.location.host}`);
  }, []);
  return (
    <Navbar expand="lg" bg="light" className="custom-navbar w-100" sticky="top">
      <Container>
        <Navbar.Brand href={pathToHostSite} className="ms-3">Marine_Translate_Term</Navbar.Brand>
        {isBranch && (
          <>
            <Navbar.Toggle aria-controls="navbarNav" className="me-2" />
            <Navbar.Collapse id="navbarNav">
              <Nav className="m-auto">
                <Nav.Item>
                  <Nav.Link disabled>Actual Branch: {sessionStorage.getItem('branch')}</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link href="#branches">Branches</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link href="#translate">Translate</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link href="#changed">Changed</Nav.Link>
                </Nav.Item>
              </Nav>
            </Navbar.Collapse>
          </>
        )}
      </Container>
    </Navbar>
  );
}

export default NavBarTranslate;