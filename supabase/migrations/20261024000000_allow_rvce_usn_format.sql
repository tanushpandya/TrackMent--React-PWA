-- Migration: Allow both 1RV/1RZ and RVCE formats for student USNs
-- Format 1: 1RVyyXXX000 / 1RZyyXXX000 (VTU institutional format, e.g. 1RV22CS001)
-- Format 2: RVCEyyXXX000 (Direct RVCE format, e.g. RVCE22CS001, RVCE22CSE001)

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_usn_format;

ALTER TABLE profiles ADD CONSTRAINT chk_usn_format
    CHECK (usn IS NULL OR usn ~ '^(1R[VZ]|RVCE)[0-9]{2}[A-Z]{2,4}[0-9]{3}$');
