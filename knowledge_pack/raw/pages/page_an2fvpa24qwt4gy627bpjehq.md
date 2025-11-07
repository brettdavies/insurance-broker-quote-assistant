[Sitemap](https://engineering.statefarm.com/sitemap/sitemap.xml)
[Open in app](https://rsci.app.link/?%24canonical_url=https%3A%2F%2Fmedium.com%2Fp%2F3b479fcc9012&%7Efeature=LoOpenInAppButton&%7Echannel=ShowPostUnderCollection&%7Estage=mobileNavBar&source=post_page---top_nav_layout_nav-----------------------------------------)
Sign up
[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fstate-farm-open-source-amazon-quicksight-user-pruning-terraform-module-3b479fcc9012&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)
[Medium Logo](https://medium.com/?source=post_page---top_nav_layout_nav-----------------------------------------)
[](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Fnew-story&source=---top_nav_layout_nav-----------------------new_post_topnav------------------)
[Search](https://medium.com/search?source=post_page---top_nav_layout_nav-----------------------------------------)
Sign up
[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fstate-farm-open-source-amazon-quicksight-user-pruning-terraform-module-3b479fcc9012&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)
![](https://miro.medium.com/v2/resize:fill:64:64/1*dmbNkD5D-u45r44go_cf0g.png)
## [State Farm Engineering Blog](https://engineering.statefarm.com/?source=post_page---publication_nav-58687c4d0d68-3b479fcc9012---------------------------------------)
·
Follow publication
[![State Farm Engineering Blog](https://miro.medium.com/v2/resize:fill:76:76/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://engineering.statefarm.com/?source=post_page---post_publication_sidebar-58687c4d0d68-3b479fcc9012---------------------------------------)
A dive into State Farm’s engineering, culture, and more
Follow publication
# State Farm Open Source — Amazon QuickSight User Pruning Terraform Module
[![State Farm Engineering](https://miro.medium.com/v2/resize:fill:64:64/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://medium.com/@statefarm-engineering?source=post_page---byline--3b479fcc9012---------------------------------------)
[State Farm Engineering](https://medium.com/@statefarm-engineering?source=post_page---byline--3b479fcc9012---------------------------------------)
Follow
3 min read
·
Nov 21, 2024
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fstate-farm-engineering-blog%2F3b479fcc9012&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fstate-farm-open-source-amazon-quicksight-user-pruning-terraform-module-3b479fcc9012&user=State+Farm+Engineering&userId=03fb36045400&source=---header_actions--3b479fcc9012---------------------clap_footer------------------)
10
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F3b479fcc9012&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fstate-farm-open-source-amazon-quicksight-user-pruning-terraform-module-3b479fcc9012&source=---header_actions--3b479fcc9012---------------------bookmark_footer------------------)
[Listen](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3D3b479fcc9012&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fstate-farm-open-source-amazon-quicksight-user-pruning-terraform-module-3b479fcc9012&source=---header_actions--3b479fcc9012---------------------post_audio_button------------------)
Share
By [Clete Blackwell II](https://www.linkedin.com/in/CleteBlackwell2) and Rex Bennett
Press enter or click to view image in full size
![](https://miro.medium.com/v2/resize:fit:700/1*aCjGCzsQXoMCe2tkQtfFQg.jpeg)
## Introduction
At State Farm®, we take pride in being a good neighbor and in helping others. We often try to find ways to give back to the communities that sustain us and, these days, that would include the online community of open source developers who create and maintain much of the code required to run the modern internet. State Farm® uses thousands of open source programs and is committed to identifying opportunities to contribute back to the community.
So now, in addition to contributing code to existing software, we are publishing some of our own software on the public internet under an open source license, allowing anyone to modify, download or redistribute that code as they see fit. You can check out any of our [open source projects on GitHub](https://github.com/StateFarmIns).
For this article we are going to look at our first open source publication — [Amazon QuickSight User Pruning Terraform Module](https://github.com/StateFarmIns/terraform-aws-quicksight-user-pruning-module). We’ll discuss the common problems it can solve, why we chose to develop it, and how we hope it proves useful to others.
## Amazon QuickSight User Pruning Terraform Module
[Amazon QuickSight](https://aws.amazon.com/quicksight/) is a business intelligence service that enables building of dashboards and reports for analytic purposes.
## Get State Farm Engineering’s stories in your inbox
Join Medium for free to get updates from this writer.
Subscribe
Subscribe
A current limitation of Amazon QuickSight is that, once an author or admin logs in, a QuickSight user is provisioned, and billed monthly indefinitely. Logging in **once** causes QuickSight to bill between [$18 and $34 per month forever](https://aws.amazon.com/quicksight/pricing/). In a small company with a handful of users, this might be acceptable. In a department with one developer, one report maker, and 15 end users, QuickSight would only bill 2 users each month. However, in an enterprise, there could be users who login from an old area and then transfer to a new area. The old area will continue paying for the QuickSight users indefinitely unless they manually deprovision those users.
That’s where our [public Terraform module](https://github.com/StateFarmIns/terraform-aws-quicksight-user-pruning-module) comes into play.
![](https://miro.medium.com/v2/resize:fit:562/1*qGC35Sha8MQtSgg7Y6rDJw.png)
When you install this module, it runs a daily job that will prune inactive users from your QuickSight account, whilst leaving active users alone. Over time, the savings provided by the module will compound, potentially saving you thousands of dollars. Here is a sample of the QuickSight monthly cost before and after implementing this module:
Press enter or click to view image in full size
![](https://miro.medium.com/v2/resize:fit:700/1*khL52YEhyNaJfOgysyYdWQ.png)
Before implementation, QuickSight costs were steadily increasing each month, because many inactive users were still provisioned. Afterward, QuickSight costs appropriately scaled to the number of active users.
If you use Amazon QuickSight, we hope you’ll give our module a try!
**To learn more about technology careers at State Farm, or to join our team visit,**[**https://www.statefarm.com/careers**](https://www.statefarm.com/careers)**.**
**Information contained in this article may not be representative of actual use cases. The views expressed in the article are personal views of the author and are not necessarily those of State Farm Mutual Automobile Insurance Company, its subsidiaries and affiliates (collectively “State Farm”). Nothing in the article should be construed as an endorsement by State Farm of any non-State Farm product or service.**
[AWS](https://medium.com/tag/aws?source=post_page-----3b479fcc9012---------------------------------------)
[Quicksight](https://medium.com/tag/quicksight?source=post_page-----3b479fcc9012---------------------------------------)
[Terraform](https://medium.com/tag/terraform?source=post_page-----3b479fcc9012---------------------------------------)
[Open Source](https://medium.com/tag/open-source?source=post_page-----3b479fcc9012---------------------------------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fstate-farm-engineering-blog%2F3b479fcc9012&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fstate-farm-open-source-amazon-quicksight-user-pruning-terraform-module-3b479fcc9012&user=State+Farm+Engineering&userId=03fb36045400&source=---footer_actions--3b479fcc9012---------------------clap_footer------------------)
10
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fstate-farm-engineering-blog%2F3b479fcc9012&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fstate-farm-open-source-amazon-quicksight-user-pruning-terraform-module-3b479fcc9012&user=State+Farm+Engineering&userId=03fb36045400&source=---footer_actions--3b479fcc9012---------------------clap_footer------------------)
10
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F3b479fcc9012&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fstate-farm-open-source-amazon-quicksight-user-pruning-terraform-module-3b479fcc9012&source=---footer_actions--3b479fcc9012---------------------bookmark_footer------------------)
[![State Farm Engineering Blog](https://miro.medium.com/v2/resize:fill:96:96/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://engineering.statefarm.com/?source=post_page---post_publication_info--3b479fcc9012---------------------------------------)
[![State Farm Engineering Blog](https://miro.medium.com/v2/resize:fill:128:128/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://engineering.statefarm.com/?source=post_page---post_publication_info--3b479fcc9012---------------------------------------)
Follow
## [Published in State Farm Engineering Blog](https://engineering.statefarm.com/?source=post_page---post_publication_info--3b479fcc9012---------------------------------------)
[56 followers](https://engineering.statefarm.com/followers?source=post_page---post_publication_info--3b479fcc9012---------------------------------------)
·[Last published Sep 4, 2025](https://engineering.statefarm.com/unifying-our-mobile-experience-how-state-farm-integrated-telematics-into-its-flagship-app-c69b29cdf03f?source=post_page---post_publication_info--3b479fcc9012---------------------------------------)
A dive into State Farm’s engineering, culture, and more
Follow
[![State Farm Engineering](https://miro.medium.com/v2/resize:fill:96:96/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://medium.com/@statefarm-engineering?source=post_page---post_author_info--3b479fcc9012---------------------------------------)
[![State Farm Engineering](https://miro.medium.com/v2/resize:fill:128:128/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://medium.com/@statefarm-engineering?source=post_page---post_author_info--3b479fcc9012---------------------------------------)
Follow
## [Written by State Farm Engineering](https://medium.com/@statefarm-engineering?source=post_page---post_author_info--3b479fcc9012---------------------------------------)
[78 followers](https://medium.com/@statefarm-engineering/followers?source=post_page---post_author_info--3b479fcc9012---------------------------------------)
·[2 following](https://medium.com/@statefarm-engineering/following?source=post_page---post_author_info--3b479fcc9012---------------------------------------)
Follow
## More from State Farm Engineering and State Farm Engineering Blog
![When the Spark Execution Plan Gets Too Big](https://miro.medium.com/v2/resize:fit:679/format:webp/1*gvrL0YtBPcBpTGYnLuaMFQ.png)
[![State Farm Engineering Blog](https://miro.medium.com/v2/resize:fill:20:20/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012----0---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
In
[State Farm Engineering Blog](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012----0---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
by
[State Farm Engineering](https://medium.com/@statefarm-engineering?source=post_page---author_recirc--3b479fcc9012----0---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
## [When the Spark Execution Plan Gets Too Big By Hunter Mitchell](https://engineering.statefarm.com/when-the-spark-execution-plan-gets-too-big-eb658872d603?source=post_page---author_recirc--3b479fcc9012----0---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
Jan 13
[](https://engineering.statefarm.com/when-the-spark-execution-plan-gets-too-big-eb658872d603?source=post_page---author_recirc--3b479fcc9012----0---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Feb658872d603&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fwhen-the-spark-execution-plan-gets-too-big-eb658872d603&source=---author_recirc--3b479fcc9012----0-----------------bookmark_preview----8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
![Level Up Your Design Practices](https://miro.medium.com/v2/resize:fit:679/format:webp/1*c7CX1RhA9D10q6DJQjqlQw.jpeg)
[![State Farm Engineering Blog](https://miro.medium.com/v2/resize:fill:20:20/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012----1---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
In
[State Farm Engineering Blog](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012----1---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
by
[State Farm Engineering](https://medium.com/@statefarm-engineering?source=post_page---author_recirc--3b479fcc9012----1---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
## [Level Up Your Design Practices By Ben Justick](https://engineering.statefarm.com/level-up-your-design-practices-0f328abda9cc?source=post_page---author_recirc--3b479fcc9012----1---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
Apr 21
[](https://engineering.statefarm.com/level-up-your-design-practices-0f328abda9cc?source=post_page---author_recirc--3b479fcc9012----1---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F0f328abda9cc&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Flevel-up-your-design-practices-0f328abda9cc&source=---author_recirc--3b479fcc9012----1-----------------bookmark_preview----8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
![Mainframe Modernization — Think big, start small, scale fast!](https://miro.medium.com/v2/resize:fit:679/format:webp/0*yl1qbsGQlfDpI2er.jpg)
[![State Farm Engineering Blog](https://miro.medium.com/v2/resize:fill:20:20/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012----2---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
In
[State Farm Engineering Blog](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012----2---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
by
[State Farm Engineering](https://medium.com/@statefarm-engineering?source=post_page---author_recirc--3b479fcc9012----2---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
## [Mainframe Modernization — Think big, start small, scale fast! By Drew Jaegle](https://engineering.statefarm.com/mainframe-modernization-think-big-start-small-scale-fast-04fd3877fa66?source=post_page---author_recirc--3b479fcc9012----2---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
Oct 1, 2023
[](https://engineering.statefarm.com/mainframe-modernization-think-big-start-small-scale-fast-04fd3877fa66?source=post_page---author_recirc--3b479fcc9012----2---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F04fd3877fa66&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fmainframe-modernization-think-big-start-small-scale-fast-04fd3877fa66&source=---author_recirc--3b479fcc9012----2-----------------bookmark_preview----8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
![DevSecFinOps: The Challenge of Implementing a Secure and Cost-Effective Container-Based CI/CD…](https://miro.medium.com/v2/resize:fit:679/format:webp/1*x56-bhK7vFKiQaMtoOPHjw.png)
[![State Farm Engineering Blog](https://miro.medium.com/v2/resize:fill:20:20/1*rI-IXNUgbtk8osZ8ZU0TLw.png)](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012----3---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
In
[State Farm Engineering Blog](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012----3---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
by
[State Farm Engineering](https://medium.com/@statefarm-engineering?source=post_page---author_recirc--3b479fcc9012----3---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
## [DevSecFinOps: The Challenge of Implementing a Secure and Cost-Effective Container-Based CI/CD… By Eddie Northcutt and Lane Leake](https://engineering.statefarm.com/devsecfinops-the-challenge-of-implementing-a-secure-and-cost-effective-container-based-ci-cd-c2257eac8eb4?source=post_page---author_recirc--3b479fcc9012----3---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
Jul 17
[](https://engineering.statefarm.com/devsecfinops-the-challenge-of-implementing-a-secure-and-cost-effective-container-based-ci-cd-c2257eac8eb4?source=post_page---author_recirc--3b479fcc9012----3---------------------8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fc2257eac8eb4&operation=register&redirect=https%3A%2F%2Fengineering.statefarm.com%2Fdevsecfinops-the-challenge-of-implementing-a-secure-and-cost-effective-container-based-ci-cd-c2257eac8eb4&source=---author_recirc--3b479fcc9012----3-----------------bookmark_preview----8d6e27c4_c26d_4285_a2b7_b61dc642a282--------------)
[See all from State Farm Engineering](https://medium.com/@statefarm-engineering?source=post_page---author_recirc--3b479fcc9012---------------------------------------)
[See all from State Farm Engineering Blog](https://engineering.statefarm.com/?source=post_page---author_recirc--3b479fcc9012---------------------------------------)
## Recommended from Medium
![🚀 Learn AWS DevOps Locally with LocalStack + Terraform + AWS CLI + Python Lambda](https://miro.medium.com/v2/resize:fit:679/format:webp/1*fUNnejWwnSSqf8rgWyWX5w.jpeg)
[![Yousaf K H](https://miro.medium.com/v2/resize:fill:20:20/1*oZKS8-8Eo7l5MVvCIxHDlw.jpeg)](https://medium.com/@yousaf.k.hamza?source=post_page---read_next_recirc--3b479fcc9012----0---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[Yousaf K H](https://medium.com/@yousaf.k.hamza?source=post_page---read_next_recirc--3b479fcc9012----0---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
## [🚀 Learn AWS DevOps Locally with LocalStack + Terraform + AWS CLI + Python Lambda When you’re starting your DevOps journey, one of the biggest challenges is practising AWS services without racking up unexpected cloud…](https://medium.com/@yousaf.k.hamza/learn-aws-devops-locally-with-localstack-terraform-aws-cli-python-lambda-6c8eb590936a?source=post_page---read_next_recirc--3b479fcc9012----0---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
Oct 4
[](https://medium.com/@yousaf.k.hamza/learn-aws-devops-locally-with-localstack-terraform-aws-cli-python-lambda-6c8eb590936a?source=post_page---read_next_recirc--3b479fcc9012----0---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F6c8eb590936a&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40yousaf.k.hamza%2Flearn-aws-devops-locally-with-localstack-terraform-aws-cli-python-lambda-6c8eb590936a&source=---read_next_recirc--3b479fcc9012----0-----------------bookmark_preview----98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
![How I Ship Across Dev, Staging, and Prod Using AWS CodePipeline, CDK, and Automated Rollbacks](https://miro.medium.com/v2/resize:fit:679/format:webp/0*oUXrkAOqZMoICI99)
[![AWS in Plain English](https://miro.medium.com/v2/resize:fill:20:20/1*6EeD87OMwKk-u3ncwAOhog.png)](https://aws.plainenglish.io/?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
In
[AWS in Plain English](https://aws.plainenglish.io/?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
by
[Zain Shoaib](https://medium.com/@zainshoaib0123?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
## [How I Ship Across Dev, Staging, and Prod Using AWS CodePipeline, CDK, and Automated Rollbacks A fully scripted multi‑account AWS CI/CD pipeline that builds, tests, security‑scans, and gradually deploys — all from a git push, all…](https://aws.plainenglish.io/how-i-ship-across-dev-staging-and-prod-using-aws-codepipeline-cdk-and-automated-rollbacks-bc9b4444cb82?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
Jul 22
[](https://aws.plainenglish.io/how-i-ship-across-dev-staging-and-prod-using-aws-codepipeline-cdk-and-automated-rollbacks-bc9b4444cb82?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fbc9b4444cb82&operation=register&redirect=https%3A%2F%2Faws.plainenglish.io%2Fhow-i-ship-across-dev-staging-and-prod-using-aws-codepipeline-cdk-and-automated-rollbacks-bc9b4444cb82&source=---read_next_recirc--3b479fcc9012----1-----------------bookmark_preview----98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
![Serving a React App with AWS CloudFront and S3 \(Terraform\)](https://miro.medium.com/v2/resize:fit:679/format:webp/1*XqlZhltXo7uJw9GaweDVIw.png)
[![WittCode](https://miro.medium.com/v2/resize:fill:20:20/1*hdotwddPYuvpvXOsn29E2A.jpeg)](https://medium.com/@wittcode?source=post_page---read_next_recirc--3b479fcc9012----0---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[WittCode](https://medium.com/@wittcode?source=post_page---read_next_recirc--3b479fcc9012----0---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
## [Serving a React App with AWS CloudFront and S3 (Terraform) Learn how to deploy and serve a React application from AWS S3 with CloudFront using Terraform.](https://medium.com/@wittcode/serving-a-react-app-with-aws-cloudfront-and-s3-terraform-8f7ac48ce11c?source=post_page---read_next_recirc--3b479fcc9012----0---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
Oct 12
[](https://medium.com/@wittcode/serving-a-react-app-with-aws-cloudfront-and-s3-terraform-8f7ac48ce11c?source=post_page---read_next_recirc--3b479fcc9012----0---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F8f7ac48ce11c&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40wittcode%2Fserving-a-react-app-with-aws-cloudfront-and-s3-terraform-8f7ac48ce11c&source=---read_next_recirc--3b479fcc9012----0-----------------bookmark_preview----98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
![Mastering AWS Lambda Deployment with Terraform: Build, Test, and Deploy](https://miro.medium.com/v2/resize:fit:679/format:webp/1*O0A6s2XFvuw7vg-VEoPHTQ.png)
[![George Lopez](https://miro.medium.com/v2/resize:fill:20:20/1*4oVEqV9IEZtNZ6rp9xgVfw.jpeg)](https://medium.com/@george.benjamin.lopez?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[George Lopez](https://medium.com/@george.benjamin.lopez?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
## [Mastering AWS Lambda Deployment with Terraform: Build, Test, and Deploy TL;DR](https://medium.com/@george.benjamin.lopez/building-testing-deploying-aws-lambda-with-terraform-1699e8d3cd9a?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
Jul 13
[](https://medium.com/@george.benjamin.lopez/building-testing-deploying-aws-lambda-with-terraform-1699e8d3cd9a?source=post_page---read_next_recirc--3b479fcc9012----1---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F1699e8d3cd9a&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40george.benjamin.lopez%2Fbuilding-testing-deploying-aws-lambda-with-terraform-1699e8d3cd9a&source=---read_next_recirc--3b479fcc9012----1-----------------bookmark_preview----98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
![AWS EKS high availability issues](https://miro.medium.com/v2/resize:fit:679/format:webp/1*nD9I3Qtnp_vX52HRtmhB0A.png)
[![System Weakness](https://miro.medium.com/v2/resize:fill:20:20/1*gncXIKhx5QOIX0K9MGcVkg.jpeg)](https://systemweakness.com/?source=post_page---read_next_recirc--3b479fcc9012----2---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
In
[System Weakness](https://systemweakness.com/?source=post_page---read_next_recirc--3b479fcc9012----2---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
by
[Ismail Kovvuru](https://medium.com/@ismailkovvuru?source=post_page---read_next_recirc--3b479fcc9012----2---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
## [How to Fix AWS EKS High Availability Issues: Spot Loss, IP Exhaustion & Scaling Delays Learn how to fix common AWS EKS high availability issues like Spot loss, IP exhaustion, and scaling delays with proven real-world solutions…](https://systemweakness.com/how-to-fix-aws-eks-high-availability-issues-spot-loss-ip-exhaustion-scaling-delays-0898227d379e?source=post_page---read_next_recirc--3b479fcc9012----2---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
Aug 18
[](https://systemweakness.com/how-to-fix-aws-eks-high-availability-issues-spot-loss-ip-exhaustion-scaling-delays-0898227d379e?source=post_page---read_next_recirc--3b479fcc9012----2---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F0898227d379e&operation=register&redirect=https%3A%2F%2Fsystemweakness.com%2Fhow-to-fix-aws-eks-high-availability-issues-spot-loss-ip-exhaustion-scaling-delays-0898227d379e&source=---read_next_recirc--3b479fcc9012----2-----------------bookmark_preview----98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
![The AWS DynamoDB Outage of October 2025: A Story of Cascading Failures](https://miro.medium.com/v2/resize:fit:679/format:webp/0*hNog7WCvwFWlBPhH)
[![Navaneeth Sen](https://miro.medium.com/v2/resize:fill:20:20/1*GO6HiBKNRSbd2xqUcvXgew.png)](https://navaneethsen.medium.com/?source=post_page---read_next_recirc--3b479fcc9012----3---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[Navaneeth Sen](https://navaneethsen.medium.com/?source=post_page---read_next_recirc--3b479fcc9012----3---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
## [The AWS DynamoDB Outage of October 2025: A Story of Cascading Failures I tried to understand and summarize with the help of an LLM on what actually brought down major AWS services when this incident occurred.](https://navaneethsen.medium.com/the-aws-dynamodb-outage-of-october-2025-a-story-of-cascading-failures-42f4b23b6379?source=post_page---read_next_recirc--3b479fcc9012----3---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
Oct 28
[](https://navaneethsen.medium.com/the-aws-dynamodb-outage-of-october-2025-a-story-of-cascading-failures-42f4b23b6379?source=post_page---read_next_recirc--3b479fcc9012----3---------------------98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F42f4b23b6379&operation=register&redirect=https%3A%2F%2Fnavaneethsen.medium.com%2Fthe-aws-dynamodb-outage-of-october-2025-a-story-of-cascading-failures-42f4b23b6379&source=---read_next_recirc--3b479fcc9012----3-----------------bookmark_preview----98f5539d_bb6a_4076_8cc8_9a182d1f6d9d--------------)
[See more recommendations](https://medium.com/?source=post_page---read_next_recirc--3b479fcc9012---------------------------------------)
[Help](https://help.medium.com/hc/en-us?source=post_page-----3b479fcc9012---------------------------------------)
[Status](https://status.medium.com/?source=post_page-----3b479fcc9012---------------------------------------)
[About](https://medium.com/about?autoplay=1&source=post_page-----3b479fcc9012---------------------------------------)
[Careers](https://medium.com/jobs-at-medium/work-at-medium-959d1a85284e?source=post_page-----3b479fcc9012---------------------------------------)
Press
[Blog](https://blog.medium.com/?source=post_page-----3b479fcc9012---------------------------------------)
[Privacy](https://policy.medium.com/medium-privacy-policy-f03bf92035c9?source=post_page-----3b479fcc9012---------------------------------------)
[Rules](https://policy.medium.com/medium-rules-30e5502c4eb4?source=post_page-----3b479fcc9012---------------------------------------)
[Terms](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f?source=post_page-----3b479fcc9012---------------------------------------)
[Text to speech](https://speechify.com/medium?source=post_page-----3b479fcc9012---------------------------------------)
