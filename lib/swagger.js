export const getApiDocs = async () => {
  return {
    openapi: "3.0.0",

    info: {
      title: "Rangdhara Fabrics API",
      version: "1.0.0",
      description: "Rangdhara Fabrics REST API documentation",
    },

    servers: [
      {
        url: "http://localhost:3000",
        description: "Local Development",
      },
      {
        url: "https://admin.rangdharafabrics.com",
        description: "Production",
      },
    ],

    tags: [
      {
        name: "Authentication",
        description: "Authentication APIs",
      },
      {
        name: "Company",
        description: "Company information APIs",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter your JWT token. Example: eyJhbGciOiJIUzI1NiIs...",
        },
      },
    },

    paths: {
      /*
       * ============================================================
       * AUTHENTICATION
       * ============================================================
       */

      "/api/auth/api-token": {
        post: {
          tags: ["Authentication"],

          summary: "Generate API token",

          description:
            "Generate a JWT Bearer token using username and password.",

          requestBody: {
            required: true,

            content: {
              "application/json": {
                schema: {
                  type: "object",

                  required: ["username", "password"],

                  properties: {
                    username: {
                      type: "string",
                      description: "API username",
                      example: "admin",
                    },

                    password: {
                      type: "string",
                      format: "password",
                      description: "API password",
                      example: "admin123",
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                "API token generated successfully.",

              content: {
                "application/json": {
                  schema: {
                    type: "object",

                    properties: {
                      success: {
                        type: "boolean",
                        example: true,
                      },

                      message: {
                        type: "string",
                        example:
                          "API token generated successfully.",
                      },

                      data: {
                        type: "object",

                        properties: {
                          token: {
                            type: "string",
                            description: "JWT API token",
                            example:
                              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          },

                          token_type: {
                            type: "string",
                            example: "Bearer",
                          },

                          expires_in: {
                            type: "string",
                            example: "7 days",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },

            401: {
              description:
                "Invalid username or password.",

              content: {
                "application/json": {
                  schema: {
                    type: "object",

                    properties: {
                      success: {
                        type: "boolean",
                        example: false,
                      },

                      message: {
                        type: "string",
                        example:
                          "Invalid username or password.",
                      },
                    },
                  },
                },
              },
            },

            500: {
              description:
                "Failed to generate API token.",
            },
          },
        },
      },

      /*
       * ============================================================
       * COMPANY
       * ============================================================
       */

      "/api/v1/getcompanyinfo": {
        get: {
          tags: ["Company"],

          summary: "Get company information",

          description:
            "Returns company information from the database.",

          security: [
            {
              bearerAuth: [],
            },
          ],

          responses: {
            200: {
              description:
                "Company information fetched successfully.",

              content: {
                "application/json": {
                  schema: {
                    type: "object",

                    properties: {
                      success: {
                        type: "boolean",
                        example: true,
                      },

                      message: {
                        type: "string",
                        example:
                          "Company information fetched successfully.",
                      },

                      data: {
                        type: "object",

                        example: {
                          company_name:
                            "Rangdhara Fabrics",

                          company_email:
                            "info@rangdharafabrics.com",

                          company_phone:
                            "+91 9999999999",
                        },
                      },
                    },
                  },
                },
              },
            },

            401: {
              description:
                "Authorization token is missing or invalid.",
            },

            500: {
              description:
                "Internal server error.",
            },
          },
        },
      },
    },
  };
};