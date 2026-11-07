import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CmsService } from "./cms.service";

@ApiTags("cms")
@Public()
@Controller("cms")
export class PublicCmsController {
  constructor(private cms: CmsService) {}
  @Get("home") home() { return this.cms.resolveHome(); }
  @Get("pages/:slug") page(@Param("slug") slug: string) { return this.cms.resolvePublicPage(slug); }
  @Get("layout") layout() { return this.cms.getLayout("default"); }
}
