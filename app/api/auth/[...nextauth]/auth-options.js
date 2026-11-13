import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";

import CredentialsProvider from "next-auth/providers/credentials";
// import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import { systemLog } from '@/services/system-log';
const authOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
        rememberMe: {
          label: "Remember me",
          type: "boolean",
        },
      },

      async authorize(credentials) {
        if (
          !credentials ||
          !credentials.email ||
          !credentials.password
        ) {
          throw new Error(
            JSON.stringify({
              code: 400,
              message: "Please enter both email and password.",
            })
          );
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error(
            JSON.stringify({
              code: 404,
              message: "User not found. Please register first.",
            })
          );
        }

        const isPasswordValid =
          credentials.password === user.password ||
          (await bcrypt.compare(
            credentials.password,
            user.password || ""
          ));

        if (!isPasswordValid) {
          throw new Error(
            JSON.stringify({
              code: 401,
              message: "Invalid credentials. Incorrect password.",
            })
          );
        }

        if (user.status !== "ACTIVE") {
          throw new Error(
            JSON.stringify({
              code: 403,
              message:
                "Account not activated. Please verify your email.",
            })
          );
        }

        /*
         * ----------------------------------------
         * UPDATE LAST SIGN-IN
         * ----------------------------------------
         */
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            lastSignInAt: new Date(),
          },
        });

        return {
          id: user.id,
          status: user.status,
          email: user.email,
          name: user.name || "Anonymous",
          roleId: user.roleId,
          avatar: user.avatar,
        };
      },
    }),
  ],

  /*
   * ============================================================
   * SESSION
   * ============================================================
   */
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },

  /*
   * ============================================================
   * CALLBACKS
   * ============================================================
   */
  callbacks: {
    /*
     * ========================================================
     * JWT CALLBACK
     * ========================================================
     */
    async jwt({
      token,
      user,
      session,
      trigger,
    }) {
      /*
       * ----------------------------------------
       * HANDLE session.update()
       * ----------------------------------------
       */
      if (
        trigger === "update" &&
        session?.user
      ) {
        token = {
          ...token,
          ...session.user,
        };

        return token;
      }

      /*
       * ----------------------------------------
       * USER LOGIN
       * ----------------------------------------
       */
      if (user) {
        token.id = user.id || token.sub;
        token.email = user.email;
        token.name = user.name;
        token.avatar = user.avatar;
        token.status = user.status;
        token.roleId = user.roleId;

        /*
         * ----------------------------------------
         * GET ROLE
         * ----------------------------------------
         */
        if (user.roleId) {
          const role =
            await prisma.userRole.findUnique({
              where: {
                id: user.roleId,
              },

              select: {
                id: true,
                name: true,
                slug: true,

                permissions: {
                  select: {
                    permission: {
                      select: {
                        slug: true,
                      },
                    },
                  },
                },
              },
            });

          /*
           * ----------------------------------------
           * ROLE INFORMATION
           * ----------------------------------------
           */
          token.roleName =
            role?.name || null;

          token.roleSlug =
            role?.slug || null;

          /*
           * ----------------------------------------
           * ADMIN USER
           * ----------------------------------------
           *
           * Admin automatically gets ALL permissions
           * from the UserPermission table.
           */
          if (role?.slug === "admin") {
            const allPermissions =
              await prisma.userPermission.findMany({
                select: {
                  slug: true,
                },
              });

            token.permissions =
              allPermissions.map(
                (permission) =>
                  permission.slug
              );
          } else {
            /*
             * ----------------------------------------
             * NORMAL USER
             * ----------------------------------------
             *
             * Only permissions assigned to the
             * user's role are returned.
             */
            token.permissions =
              role?.permissions?.map(
                (item) =>
                  item.permission.slug
              ) || [];
          }
        } else {
          /*
           * ----------------------------------------
           * NO ROLE
           * ----------------------------------------
           */
          token.roleName = null;
          token.roleSlug = null;
          token.permissions = [];
        }
      }

      return token;
    },

    /*
     * ========================================================
     * SESSION CALLBACK
     * ========================================================
     */
    async session({
      session,
      token,
    }) {
      if (session.user) {
        session.user.id =
          token.id;

        session.user.email =
          token.email;

        session.user.name =
          token.name;

        session.user.avatar =
          token.avatar;

        session.user.status =
          token.status;

        /*
         * ----------------------------------------
         * ROLE
         * ----------------------------------------
         */
        session.user.roleId =
          token.roleId;

        session.user.roleName =
          token.roleName;

        session.user.roleSlug =
          token.roleSlug;

        /*
         * ----------------------------------------
         * PERMISSIONS
         * ----------------------------------------
         */
        session.user.permissions =
          token.permissions || [];
      }

      return session;
    },
  },

  /*
   * ============================================================
   * PAGES
   * ============================================================
   */
  pages: {
    signIn: "/signin",
  },
  // Add these properties inside your existing authOptions object.
  events: {
    async signIn({ user }) {
      if (!user?.id) return;

      await systemLog({
        event: 'SIGN_IN',
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        description: `User ${user.email ?? user.id} signed in`,
      });
    },

    async signOut({ token, session }) {
      const userId = token?.sub ?? session?.user?.id;

      if (!userId) return;

      await systemLog({
        event: 'SIGN_OUT',
        userId,
        entityType: 'User',
        entityId: userId,
        description: 'User signed out',
      });
    },
  },
};

export default authOptions;