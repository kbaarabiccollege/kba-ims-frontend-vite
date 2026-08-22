// src/utils/userConstants.js

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const ADDRESS_ROWS = [
    { key: "door_no", label: "Door No" },
    { key: "street", label: "Street", textarea: true },
    { key: "area", label: "Area" },
    { key: "city", label: "City" },
    { key: "district", label: "District" },
    { key: "state", label: "State" },
    { key: "country", label: "Country" },
    { key: "pin_code", label: "Pin Code" },
  ];

export const emptyAddress = (typeId) => ({
    address_type: typeId,
    door_no: "",
    street: "",
    area: "",
    city: "",
    district: "",
    state: "",
    country: "",
    pin_code: "",
  });

export const ADDRESS_TYPES = [
  { id: 0, key: "present", label: "Present Address" },
  { id: 1, key: "permanent", label: "Permanent Address" },
];

export const GENDER_OPTIONS = [
  { id: 1, label: "Male" },
  { id: 2, label: "Female" },
  { id: 3, label: "Others" },
];


export const BLOOD_GROUP_OPTIONS = [
    { id: 1, label: "A+" },
    { id: 2, label: "A-" },
    { id: 3, label: "B+" },
    { id: 4, label: "B-" },
    { id: 5, label: "O+" },
    { id: 6, label: "O-" },
    { id: 7, label: "AB+" },
    { id: 8, label: "AB-" },
  ];

export const RELIGION_OPTIONS = [
  { id: 1, label: "Muslim" },
  { id: 2, label: "Hindu" },
  { id: 3, label: "Christian" },
  { id: 4, label: "Other" },
];