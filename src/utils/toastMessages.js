// src/utils/toastMessages.js
//
// Keeps toast wording consistent everywhere (Users, Students, Staff,
// Academics, ...) instead of every page hand-writing its own string.
//
// Usage:
//   import { crudMessage } from "../../../utils/toastMessages";
//   toast.success(crudMessage("create", "User", "success"));   // "User created successfully"
//   toast.error(crudMessage("create", "User", "error"));       // "User creation failed"
//   toast.success(crudMessage("update", "Student", "success"));// "Student updated successfully"
//   toast.error(crudMessage("update", "Password", "error"));   // "Password update failed"
//
// If a server message is available (e.g. from a Joi validation error),
// prefer that over the generic fallback — see the AdminUsers.jsx example.

const ACTION_WORDING = {
    create: { success: "created", errorNoun: "creation" },
    update: { success: "updated", errorNoun: "update" },
    delete: { success: "deleted", errorNoun: "deletion" },
  };
  
  /**
   * @param {"create"|"update"|"delete"} action
   * @param {string} entity - e.g. "User", "Student", "Password"
   * @param {"success"|"error"} outcome
   */
  export const crudMessage = (action, entity, outcome) => {
    const wording = ACTION_WORDING[action];
    if (!wording) {
      throw new Error(`crudMessage: unknown action "${action}". Use "create" | "update" | "delete".`);
    }
  
    if (outcome === "success") {
      return `${entity} ${wording.success} successfully`;
    }
    return `${entity} ${wording.errorNoun} failed`;
  };
  
  // Small convenience wrappers if you don't want to pass the outcome string by hand.
  export const createSuccess = (entity) => crudMessage("create", entity, "success");
  export const createError = (entity) => crudMessage("create", entity, "error");
  export const updateSuccess = (entity) => crudMessage("update", entity, "success");
  export const updateError = (entity) => crudMessage("update", entity, "error");
  export const deleteSuccess = (entity) => crudMessage("delete", entity, "success");
  export const deleteError = (entity) => crudMessage("delete", entity, "error");