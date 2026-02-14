import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { getListingBySlug, submitListingApplication } from "../services/api";
import { useEffect } from "react";

function formatCurrency(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

const initialFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  current_address: "",
  current_city: "",
  current_state: "",
  current_zip: "",
  current_landlord_name: "",
  current_landlord_phone: "",
  current_rent: "",
  reason_for_moving: "",
  employer_name: "",
  employer_phone: "",
  job_title: "",
  monthly_income: "",
  employment_length: "",
  num_occupants: 1,
  has_pets: false,
  pet_description: "",
  has_been_evicted: false,
  has_criminal_history: false,
  additional_notes: "",
  references: [{ name: "", phone: "", relationship: "" }],
  consent_background_check: false,
  consent_credit_check: false,
  electronic_signature: "",
};

const STEP_LABELS = [
  "Personal Information",
  "Current Residence",
  "Employment & Income",
  "Additional Details",
  "References",
  "Review & Submit",
];

function ListingApply() {
  const { slug } = useParams();
  const [step, setStep] = useState(0);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(initialFormState);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getListingBySlug(slug);
        setListing(response.data || null);
        document.title = `${response.data?.listing_title || "Apply Now"} | Onyx PM`;
        setLoading(false);
      } catch {
        setErrorMessage("This listing is no longer available.");
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const setField = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setReferenceField = (index, field, value) => {
    setForm((prev) => {
      const next = [...(prev.references || [])];
      if (!next[index]) {
        next[index] = { name: "", phone: "", relationship: "" };
      }
      next[index] = { ...next[index], [field]: value };
      return { ...prev, references: next };
    });
    setErrors((prev) => ({ ...prev, [`references_${index}`]: "" }));
  };

  const addReference = () => {
    setForm((prev) => {
      const refs = Array.isArray(prev.references) ? prev.references : [];
      if (refs.length >= 3) return prev;
      return { ...prev, references: [...refs, { name: "", phone: "", relationship: "" }] };
    });
  };

  const removeReference = (index) => {
    setForm((prev) => {
      const refs = (prev.references || []).filter((_, i) => i !== index);
      return { ...prev, references: refs.length ? refs : [] };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`reference_${index}_name`];
      delete next[`reference_${index}_phone`];
      delete next[`reference_${index}_relationship`];
      return next;
    });
  };

  const validateStep = () => {
    const nextErrors = {};
    if (step === 0) {
      if (!form.first_name.trim()) nextErrors.first_name = "First name is required.";
      if (!form.last_name.trim()) nextErrors.last_name = "Last name is required.";
      if (!form.email.trim()) nextErrors.email = "Email is required.";
      if (!form.phone.trim()) nextErrors.phone = "Phone is required.";
      if (!form.date_of_birth) nextErrors.date_of_birth = "Date of birth is required.";
    } else if (step === 1) {
      if (!form.current_address.trim()) nextErrors.current_address = "Current address is required.";
      if (!form.current_city.trim()) nextErrors.current_city = "City is required.";
      if (!form.current_state.trim()) nextErrors.current_state = "State is required.";
      if (!form.current_zip.trim()) nextErrors.current_zip = "Zip is required.";
      if (form.current_rent !== "" && Number.isNaN(Number(form.current_rent))) {
        nextErrors.current_rent = "Monthly rent must be a number.";
      }
    } else if (step === 2) {
      if (form.monthly_income !== "" && Number.isNaN(Number(form.monthly_income))) {
        nextErrors.monthly_income = "Monthly income must be a number.";
      }
    } else if (step === 3) {
      if (Number(form.num_occupants) < 1) nextErrors.num_occupants = "At least 1 occupant is required.";
      if (form.has_pets && !form.pet_description.trim()) {
        nextErrors.pet_description = "Describe pets before continuing.";
      }
    } else if (step === 4) {
      const refs = form.references || [];
      if (refs.length === 0) {
        nextErrors.references = "At least one reference is required.";
      }
      refs.forEach((ref, index) => {
        if (!ref?.name?.trim()) nextErrors[`reference_${index}_name`] = "Name is required.";
        if (!ref?.phone?.trim()) nextErrors[`reference_${index}_phone`] = "Phone is required.";
        if (!ref?.relationship?.trim()) nextErrors[`reference_${index}_relationship`] = "Relationship is required.";
      });
    } else if (step === 5) {
      if (!form.consent_background_check) {
        nextErrors.consent_background_check = "Background check authorization is required.";
      }
      if (!form.consent_credit_check) {
        nextErrors.consent_credit_check = "Credit check authorization is required.";
      }
      if (!form.electronic_signature.trim()) {
        nextErrors.electronic_signature = "Electronic signature is required.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((value) => Math.min(STEP_LABELS.length - 1, value + 1));
  };

  const goBack = () => {
    setStep((value) => Math.max(0, value - 1));
  };

  const payload = useMemo(() => {
    const references = (form.references || []).filter(
      (item) => item && (item.name || item.phone || item.relationship)
    );

    return {
      ...form,
      current_rent: form.current_rent ? Number(form.current_rent) : null,
      monthly_income: form.monthly_income ? Number(form.monthly_income) : null,
      num_occupants: Number(form.num_occupants || 1),
      references,
    };
  }, [form]);

  const handleSubmit = async () => {
    if (!validateStep()) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      const response = await submitListingApplication(slug, payload);
      setSuccess(response?.data || {});
    } catch (error) {
      if (error?.response?.data && typeof error.response.data === "object") {
        const serverErrors = {};
        Object.entries(error.response.data).forEach(([field, value]) => {
          if (typeof value === "string") {
            serverErrors[field] = value;
          } else if (Array.isArray(value)) {
            serverErrors[field] = value.join(" ");
          } else {
            serverErrors[field] = String(value);
          }
        });
        setErrors(serverErrors);
      }
      setErrorMessage("Unable to submit application. Please review and retry.");
    } finally {
      setSubmitting(false);
    }
  };

  const listingTitle = listing?.listing_title || `Unit ${listing?.unit_number || ""}`;
  const propertyAddress = listing?.full_address || listing?.property_name || "";

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", color: "#1a1a1a", p: 3 }}>
        <Typography>Loading listing...</Typography>
      </Box>
    );
  }

  if (errorMessage && !listing) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", color: "#1a1a1a", p: 3 }}>
        <Typography color="error">{errorMessage}</Typography>
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#f8fafc",
          color: "#1a1a1a",
          display: "grid",
          placeItems: "center",
          p: 2,
        }}
      >
        <Paper sx={{ width: "min(680px, 100%)", p: { xs: 2.2, md: 3 }, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Application Submitted!
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 1.2 }}>
            Thank you for applying. Your application is being reviewed and you'll hear back within 24-48 hours.
          </Typography>
          <Typography sx={{ mb: 0.8 }}>
            Reference number: <strong>{success.reference_number || "Generated"}</strong>
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>
            Status: <strong>{success.status || "submitted"}</strong>
          </Typography>
          <Button component={Link} to={`/listing/${slug}`} variant="contained">
            Back to Listing
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", color: "#1a1a1a", py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>
      <Paper
        sx={{
          maxWidth: 920,
          mx: "auto",
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.4 }}>
          Apply for {listingTitle}
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 1.2 }}>
          {propertyAddress} · {formatCurrency(listing?.rent_amount)}/month
        </Typography>

        <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
          {STEP_LABELS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}

        {step === 0 ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={form.first_name}
                onChange={setField("first_name")}
                required
                error={Boolean(errors.first_name)}
                helperText={errors.first_name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={form.last_name}
                onChange={setField("last_name")}
                required
                error={Boolean(errors.last_name)}
                helperText={errors.last_name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={setField("email")}
                required
                error={Boolean(errors.email)}
                helperText={errors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={setField("phone")}
                required
                error={Boolean(errors.phone)}
                helperText={errors.phone}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth"
                InputLabelProps={{ shrink: true }}
                value={form.date_of_birth}
                onChange={setField("date_of_birth")}
                required
                error={Boolean(errors.date_of_birth)}
                helperText={errors.date_of_birth}
              />
            </Grid>
          </Grid>
        ) : step === 1 ? (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Address"
                value={form.current_address}
                onChange={setField("current_address")}
                required
                error={Boolean(errors.current_address)}
                helperText={errors.current_address}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={form.current_city}
                onChange={setField("current_city")}
                required
                error={Boolean(errors.current_city)}
                helperText={errors.current_city}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={form.current_state}
                onChange={setField("current_state")}
                required
                error={Boolean(errors.current_state)}
                helperText={errors.current_state}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Zip"
                value={form.current_zip}
                onChange={setField("current_zip")}
                required
                error={Boolean(errors.current_zip)}
                helperText={errors.current_zip}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Landlord Name (optional)"
                value={form.current_landlord_name}
                onChange={setField("current_landlord_name")}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Landlord Phone (optional)"
                value={form.current_landlord_phone}
                onChange={setField("current_landlord_phone")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Current Monthly Rent (optional)"
                type="number"
                value={form.current_rent}
                onChange={setField("current_rent")}
                error={Boolean(errors.current_rent)}
                helperText={errors.current_rent}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Reason for Moving"
                value={form.reason_for_moving}
                onChange={setField("reason_for_moving")}
              />
            </Grid>
          </Grid>
        ) : step === 2 ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employer Name"
                value={form.employer_name}
                onChange={setField("employer_name")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employer Phone"
                value={form.employer_phone}
                onChange={setField("employer_phone")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={form.job_title}
                onChange={setField("job_title")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monthly Income"
                type="number"
                value={form.monthly_income}
                onChange={setField("monthly_income")}
                error={Boolean(errors.monthly_income)}
                helperText={errors.monthly_income}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Length of Employment"
                value={form.employment_length}
                onChange={setField("employment_length")}
                placeholder='e.g. "2 years"'
              />
            </Grid>
          </Grid>
        ) : step === 3 ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Number of Occupants"
                value={form.num_occupants}
                onChange={setField("num_occupants")}
                error={Boolean(errors.num_occupants)}
                helperText={errors.num_occupants}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={form.has_pets} onChange={setField("has_pets")} />}
                label="Pets on property"
              />
            </Grid>
            {form.has_pets ? (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pet Description"
                  value={form.pet_description}
                  onChange={setField("pet_description")}
                  required
                  error={Boolean(errors.pet_description)}
                  helperText={errors.pet_description}
                />
              </Grid>
            ) : null}
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={form.has_been_evicted} onChange={setField("has_been_evicted")} />}
                label="Have you been evicted?"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={form.has_criminal_history} onChange={setField("has_criminal_history")} />}
                label="Any criminal history?"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Additional Notes"
                value={form.additional_notes}
                onChange={setField("additional_notes")}
              />
            </Grid>
          </Grid>
        ) : step === 4 ? (
          <Box>
            <Box sx={{ mb: 2 }}>
              {(form.references || []).map((reference, index) => (
                <Paper
                  key={`${reference.name}-${index}`}
                  variant="outlined"
                  sx={{ p: 2, mb: 1.4, borderRadius: 1.5 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.2, mb: 1.2 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Reference {index + 1}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeReference(index)}
                      disabled={(form.references || []).length <= 1}
                    >
                      Remove
                    </Button>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        size="small"
                        value={reference?.name || ""}
                        onChange={(event) => setReferenceField(index, "name", event.target.value)}
                        required
                        error={Boolean(errors[`reference_${index}_name`])}
                        helperText={errors[`reference_${index}_name`]}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Phone"
                        size="small"
                        value={reference?.phone || ""}
                        onChange={(event) => setReferenceField(index, "phone", event.target.value)}
                        required
                        error={Boolean(errors[`reference_${index}_phone`])}
                        helperText={errors[`reference_${index}_phone`]}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Relationship"
                        size="small"
                        value={reference?.relationship || ""}
                        onChange={(event) => setReferenceField(index, "relationship", event.target.value)}
                        required
                        error={Boolean(errors[`reference_${index}_relationship`])}
                        helperText={errors[`reference_${index}_relationship`]}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              <Button variant="outlined" size="small" onClick={addReference} disabled={(form.references || []).length >= 3}>
                Add Reference
              </Button>
            </Box>
            {errors.references ? <Alert severity="warning">{errors.references}</Alert> : null}
          </Box>
        ) : (
          <Box>
            <Typography sx={{ mb: 1.4, fontWeight: 600 }}>Review and Confirm</Typography>
            <Paper variant="outlined" sx={{ p: 1.6, mb: 2, borderRadius: 1.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.2 }}>
                <Box>
                  <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Applicant</Typography>
                  <Typography>{`${form.first_name} ${form.last_name}`}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{form.email}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{form.phone}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Residence</Typography>
                  <Typography>{form.current_address}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                    {form.current_city}, {form.current_state} {form.current_zip}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Employment</Typography>
                  <Typography>{form.employer_name || "Not provided"}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                    {form.monthly_income ? formatCurrency(form.monthly_income) : "No income provided"}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "text.secondary", fontSize: 12 }}>Occupancy</Typography>
                  <Typography>{form.num_occupants} occupant(s)</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                    {form.has_pets ? `Pets: ${form.pet_description || "Yes"}` : "No pets"}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Divider sx={{ my: 1.6 }} />
            <Box sx={{ display: "grid", gap: 1 }}>
              <FormControlLabel
                control={<Checkbox checked={form.consent_background_check} onChange={setField("consent_background_check")} />}
                label="I authorize a background check"
              />
              {errors.consent_background_check ? <Typography color="error" sx={{ mt: -1 }}>{errors.consent_background_check}</Typography> : null}

              <FormControlLabel
                control={<Checkbox checked={form.consent_credit_check} onChange={setField("consent_credit_check")} />}
                label="I authorize a credit check"
              />
              {errors.consent_credit_check ? <Typography color="error" sx={{ mt: -1 }}>{errors.consent_credit_check}</Typography> : null}

              <TextField
                fullWidth
                label="Type your full legal name as your electronic signature"
                value={form.electronic_signature}
                onChange={setField("electronic_signature")}
                error={Boolean(errors.electronic_signature)}
                helperText={errors.electronic_signature}
              />
            </Box>

            <Typography sx={{ mt: 1.4, fontSize: 12, color: "text.secondary" }}>
              By submitting, you agree the information is accurate and authorize verification checks.
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
          <Box>
            {step > 0 ? (
              <Button onClick={goBack} variant="text" sx={{ color: "text.secondary" }}>
                Back
              </Button>
            ) : null}
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {step < STEP_LABELS.length - 1 ? (
              <Button variant="contained" onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
              >
                Submit Application
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip label={
            `Status: ${
              form.has_been_evicted ? "Eviction history noted" : "No prior eviction"
            }`
          } />
          <Chip label={
            `Criminal history: ${form.has_criminal_history ? "Reported" : "Not reported"}`
          } />
          <Chip label={`Units needed: ${form.num_occupants}`} />
        </Box>
      </Paper>
    </Box>
  );
}

export default ListingApply;
