import crypto from "crypto";
import { json, sha256Hex, supabaseFetch, sendEmail, env, addHoursIso } from "./_utils.js";

export default async function handler(req,res){

if(req.method !== "POST")
return json(res,405,{error:"Method not allowed"});

const { email } = req.body || {};

if(!email)
return json(res,400,{error:"Missing email"});

const cleanEmail = email.toLowerCase().trim();

const accessExpiresAt =
new Date(Date.now()+30*24*3600*1000).toISOString();

await supabaseFetch("/rest/v1/customers?on_conflict=email",{

method:"POST",

headers:{Prefer:"resolution=merge-duplicates"},

body:{

email:cleanEmail,

has_access:true,

access_expires_at:accessExpiresAt

}

});

const token =
crypto.randomBytes(32).toString("hex");

const tokenHash =
sha256Hex(token);

const expiresAt =
addHoursIso(24);

await supabaseFetch("/rest/v1/magic_links",{

method:"POST",

body:{

customer_email:cleanEmail,

token_hash:tokenHash,

expires_at:expiresAt

}

});

const link =
`${env("APP_BASE_URL")}/magic.html?token=${token}`;

await sendEmail({

to:cleanEmail,

subject:"Your CV Builder access",

html:`

<h2>Access granted</h2>

<a href="${link}">
Open CV Builder
</a>

`

});

return json(res,200,{ok:true});

}
