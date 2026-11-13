const baseUrl =
            process.env.NEXT_PUBLIC_BASE_PATH ||
            request.headers.get("origin") ||
            "http://localhost:3000";

const generalSettings = {
  purchaseLink: 'https://1.envato.market/Vm7VRE',
  docsLink: '',
  licenseLink: '',
  devsLink: baseUrl,
  faqLink: baseUrl,
  aboutLink: baseUrl
};

export { generalSettings };