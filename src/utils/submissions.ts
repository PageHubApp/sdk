/**
 * Form submission handler — the host app registers a concrete impl
 * (e.g. POST /api/submissions); the SDK's Form component calls SaveSubmissions.
 */

type SubmissionHandler = (
  submission: any,
  settings: any,
  additional?: any
) => Promise<any> | void;

let _saveSubmissions: SubmissionHandler = () => {};

export const registerSubmissionHandler = (fn: SubmissionHandler) => {
  _saveSubmissions = fn;
};

export const SaveSubmissions = (submission: any, settings: any, additional?: any) =>
  _saveSubmissions(submission, settings, additional);
