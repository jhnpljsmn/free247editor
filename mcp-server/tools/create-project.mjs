import { createProject } from '../../src/project.mjs';

/** @type {import('@modelcontextprotocol/sdk/types.js').Tool} */
export const createProjectTool = {
  definition: {
    name: 'create-project',
    description: 'Create a new video project folder with the specified format and resolution. Projects are stored in the projects/ directory.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Project identifier. Must be kebab-case (lowercase, hyphens only). Example: "zombie-ep1"',
        },
        name: {
          type: 'string',
          description: 'Human-readable project name. Defaults to the ID if not provided.',
        },
        format: {
          type: 'string',
          enum: ['vertical', 'horizontal'],
          description: 'Video format. "vertical" = 1080x1920 (9:16). "horizontal" = 1920x1080 (16:9).',
          default: 'vertical',
        },
      },
      required: ['id'],
    },
  },

  async execute(args) {
    const project = createProject(args.id, {
      name: args.name,
      format: args.format || 'vertical',
    });

    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        format: project.format,
        resolution: project.resolution,
        fps: project.fps,
        path: `projects/${project.id}/`,
      },
      nextSteps: [
        `Drop assets into projects/${project.id}/assets/`,
        `Create script.md in the project folder or paste it to parse-script`,
      ],
    };
  },
};
