import java.sql.DriverManager
import org.flywaydb.core.Flyway
import org.jooq.codegen.GenerationTool
import org.jooq.meta.jaxb.Configuration as JooqConfiguration
import org.jooq.meta.jaxb.Database
import org.jooq.meta.jaxb.Generate
import org.jooq.meta.jaxb.Generator
import org.jooq.meta.jaxb.Jdbc
import org.jooq.meta.jaxb.Target
import org.testcontainers.containers.PostgreSQLContainer

buildscript {
    dependencies {
        classpath("org.postgresql:postgresql:42.7.4")
        classpath("org.flywaydb:flyway-core:11.8.2")
        classpath("org.flywaydb:flyway-database-postgresql:11.8.2")
        classpath("org.testcontainers:postgresql:1.20.4")
        classpath("org.jooq:jooq-codegen:3.20.0")
        classpath("org.jooq:jooq-meta:3.20.0")
        classpath("org.jooq:jooq-meta-extensions:3.20.0")
    }
}

plugins {
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"
    id("org.springframework.boot") version "4.0.6"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("plugin.jpa") version "2.2.21"
}

group = "dawn.awesomity.uk"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(24)
    }
}

repositories {
    mavenCentral()
}

extra["springModulithVersion"] = "2.0.6"

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    implementation("org.jooq:jooq:3.20.0")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation("org.springframework.boot:spring-boot-starter-thymeleaf")
    implementation("org.springframework.boot:spring-boot-starter-restclient")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.2")
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation("org.springframework.modulith:spring-modulith-starter-jpa")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.apache.poi:poi-ooxml:5.2.5")
    implementation("io.github.openhtmltopdf:openhtmltopdf-pdfbox:1.1.24")
    implementation("io.github.openhtmltopdf:openhtmltopdf-slf4j:1.1.24")
    runtimeOnly("org.postgresql:postgresql")
    runtimeOnly("org.springframework.modulith:spring-modulith-runtime")

    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
    testImplementation("org.springframework.boot:spring-boot-starter-jooq-test")
    testImplementation("org.springframework.boot:spring-boot-starter-mail-test")
    testImplementation("org.springframework.boot:spring-boot-starter-restclient-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.4.0")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.modulith:spring-modulith-bom:${property("springModulithVersion")}")
    }
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

sourceSets {
    main {
        kotlin {
            srcDir("src/generated")
        }
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

class JooqPostgresContainer : PostgreSQLContainer<JooqPostgresContainer>("postgres:18-alpine")

val generateJooqClasses by tasks.registering {
    group = "jooq"
    description = "Starts PostgreSQL Testcontainer, runs Flyway migrations, and generates jOOQ Kotlin classes."

    doLast {
        JooqPostgresContainer().use { postgres ->
            postgres.withDatabaseName("uk_backend")
            postgres.withUsername("postgres")
            postgres.withPassword("postgres")
            postgres.start()

            println("[jOOQ gen] Container started: ${postgres.jdbcUrl}")

            val flyway = Flyway.configure()
                .dataSource(postgres.jdbcUrl, postgres.username, postgres.password)
                .locations("filesystem:${project.projectDir}/src/main/resources/db/migration")
                .load()

            val result = flyway.migrate()
            println("[jOOQ gen] Flyway applied ${result.migrationsExecuted} migration(s), success=${result.success}")

            DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password).use { conn ->
                val rs = conn.createStatement().executeQuery(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
                )
                println("[jOOQ gen] Tables in public schema:")
                while (rs.next()) println("  - ${rs.getString(1)}")
            }

            val outputDir = "${project.projectDir}/src/generated"
            println("[jOOQ gen] Writing to: $outputDir")

            GenerationTool.generate(
                JooqConfiguration()
                    .withLogging(org.jooq.meta.jaxb.Logging.INFO)
                    .withJdbc(
                        Jdbc()
                            .withDriver("org.postgresql.Driver")
                            .withUrl(postgres.jdbcUrl)
                            .withUser(postgres.username)
                            .withPassword(postgres.password)
                    )
                    .withGenerator(
                        Generator()
                            .withName("org.jooq.codegen.KotlinGenerator")
                            .withDatabase(
                                Database()
                                    .withName("org.jooq.meta.postgres.PostgresDatabase")
                                    .withInputSchema("public")
                                    .withIncludes(".*")
                                    .withExcludes("flyway_schema_history")
                            )
                            .withGenerate(
                                Generate()
                                    .withRecords(true)
                                    .withPojos(false)
                                    .withDaos(false)
                                    .withFluentSetters(true)
                                    .withKotlinNotNullPojoAttributes(true)
                                    .withKotlinNotNullRecordAttributes(true)
                                    .withKotlinNotNullInterfaceAttributes(true)
                            )
                            .withTarget(
                                Target()
                                    .withPackageName("jooq")
                                    .withDirectory(outputDir)
                            )
                    )
            )
        }
    }
}
