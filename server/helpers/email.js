import sgMail from "@sendgrid/mail";
import config from "../../config";

const { MAIL_KEY, emailTemplates } = config;

function sendMail({ sendTo = "to", mailSubject = "subject", template }) {
  sgMail.setApiKey(MAIL_KEY || "API KEY");
  const msg = {
    to: sendTo,
    from: "info@tubu.io",
    subject: mailSubject || "Registration",
    templateId: emailTemplates[template.id],
    dynamic_template_data: {
      ...template.data,
    },
  };
  return sgMail.send(msg, false);
}

export default { sendMail };
